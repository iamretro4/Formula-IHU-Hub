/**
 * Google Drive sync: ensure team subfolder exists and upload file.
 *
 * Authentication: Uses OAuth2 refresh token so files are created as a real
 * user (with storage quota). Set these env vars:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *   GOOGLE_DRIVE_ROOT_FOLDER_ID  (the folder where team subfolders go)
 *
 * Fallback: service account via GOOGLE_APPLICATION_CREDENTIALS_JSON
 * (only works with Shared Drives, since service accounts have no quota).
 */

import { Readable } from 'stream';
import { google, drive_v3 } from 'googleapis';

/**
 * Normalize PEM private key from env.
 */
function normalizePrivateKey(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let key = raw
    .replace(/^["']|["']$/g, '')
    .replace(/\\\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  if (!key.includes('-----BEGIN')) {
    console.error('[Google Drive] Private key is missing PEM header');
    return '';
  }
  return key;
}

function getAuth() {
  // ── Option 1: OAuth2 refresh token (personal account — recommended) ──
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    console.log('[Google Drive] Auth using OAuth2 refresh token');
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    return oauth2;
  }

  // ── Option 2: Service account JSON (Shared Drives only) ──
  const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (json) {
    const cleanJson = json.replace(/^['"]|['"]$/g, '');
    let credentials: { client_email?: string; private_key?: string };
    try {
      credentials = typeof cleanJson === 'string' ? JSON.parse(cleanJson) : cleanJson;
    } catch (parseErr) {
      console.error('[Google Drive] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', parseErr);
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON');
    }
    const privateKey = normalizePrivateKey(credentials.private_key || '');
    if (!privateKey) {
      throw new Error('Missing or invalid private_key in GOOGLE_APPLICATION_CREDENTIALS_JSON');
    }
    console.log(`[Google Drive] Auth using service account: ${credentials.client_email}`);
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
  }

  // ── Option 3: Service account email + key pair (Shared Drives only) ──
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (email && key) {
    const privateKey = normalizePrivateKey(key);
    if (!privateKey) throw new Error('Missing or invalid GOOGLE_PRIVATE_KEY');
    console.log(`[Google Drive] Auth using service account email+key: ${email}`);
    return new google.auth.GoogleAuth({
      credentials: { client_email: email, private_key: privateKey },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
  }

  throw new Error(
    'Missing Google Drive credentials. Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN ' +
    '(for personal account), or GOOGLE_APPLICATION_CREDENTIALS_JSON (for service account + Shared Drive).'
  );
}

/**
 * Get or create a team subfolder inside the root folder.
 */
async function getOrCreateTeamFolder(
  drive: drive_v3.Drive,
  rootFolderId: string,
  teamId: string,
  teamName: string
): Promise<string> {
  const folderName = `${teamName || teamId} (${teamId})`;

  const escapedFolderName = folderName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const teamList = await drive.files.list({
    q: `'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${escapedFolderName}' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const teamFolder = teamList.data.files?.[0];
  if (teamFolder?.id) {
    console.log(`[Google Drive] Found existing team folder: ${folderName} (${teamFolder.id})`);
    return teamFolder.id;
  }

  console.log(`[Google Drive] Creating team folder: ${folderName} under ${rootFolderId}`);
  const createTeam = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  const id = createTeam.data.id;
  if (!id) throw new Error('Could not create team folder');
  return id;
}

/**
 * Upload a file to the team's Google Drive subfolder.
 */
export async function uploadToDrive(params: {
  teamId: string;
  teamName: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType?: string;
}): Promise<{ fileId: string; webViewLink?: string }> {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  if (!rootId) {
    throw new Error(
      'GOOGLE_DRIVE_ROOT_FOLDER_ID is required. Set it to the Google Drive folder ID where team subfolders should be created.'
    );
  }

  console.log(`[Google Drive] Root folder ID: ${rootId}`);

  const teamFolderId = await getOrCreateTeamFolder(
    drive,
    rootId,
    params.teamId,
    params.teamName
  );

  const mimeType = params.mimeType || 'application/octet-stream';
  console.log(`[Google Drive] Uploading "${params.fileName}" (${mimeType}) to folder ${teamFolderId}`);

  const res = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [teamFolderId],
    },
    media: {
      mimeType,
      body: Readable.from(params.fileBuffer),
    },
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  });

  const fileId = res.data.id;
  if (!fileId) throw new Error('Drive upload did not return file id');
  return { fileId, webViewLink: res.data.webViewLink ?? undefined };
}
