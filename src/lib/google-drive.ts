/**
 * Google Drive sync: ensure team subfolder exists and upload file.
 * Uses a service account. Set GOOGLE_DRIVE_ROOT_FOLDER_ID to a folder shared with the service account (Editor).
 */

import { Readable } from 'stream';
import { google, drive_v3 } from 'googleapis';

const ROOT_FOLDER_NAME = 'Formula IHU Uploads';

/**
 * Normalize PEM private key from env.
 * Handles multiple escaping scenarios:
 *  - Vercel double-escaping: \\n → \n
 *  - Literal \n strings: \n → real newline
 *  - Windows line endings: \r\n → \n
 *  - Wrapped quotes from env var UI
 */
function normalizePrivateKey(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let key = raw
    // Strip surrounding quotes if present (some env UIs add them)
    .replace(/^["']|["']$/g, '')
    // Handle double-escaped newlines (\\n → \n)
    .replace(/\\\\n/g, '\n')
    // Handle escaped newlines (\n → real newline)
    .replace(/\\n/g, '\n')
    // Normalize Windows line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  // If the key somehow lost its PEM header/footer, it's invalid
  if (!key.includes('-----BEGIN')) {
    console.error('[Google Drive] Private key is missing PEM header');
    return '';
  }
  return key;
}

function getAuth() {
  const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;

  if (json) {
    // Strip surrounding single/double quotes (Vercel UI or .env files may add them)
    const cleanJson = json.replace(/^['"]|['"]$/g, '');
    let credentials: { client_email?: string; private_key?: string };
    try {
      credentials = typeof cleanJson === 'string' ? JSON.parse(cleanJson) : cleanJson;
    } catch (parseErr) {
      console.error('[Google Drive] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', parseErr);
      console.error('[Google Drive] First 100 chars:', json.substring(0, 100));
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON');
    }
    const privateKey = normalizePrivateKey(credentials.private_key || '');
    if (!privateKey) {
      console.error('[Google Drive] private_key is empty or invalid after normalization');
      throw new Error('Missing or invalid private_key in GOOGLE_APPLICATION_CREDENTIALS_JSON');
    }
    console.log(`[Google Drive] Auth using JSON credentials for ${credentials.client_email}`);
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
  }

  if (email && key) {
    const privateKey = normalizePrivateKey(key);
    if (!privateKey) throw new Error('Missing or invalid GOOGLE_PRIVATE_KEY');
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
  }

  throw new Error(
    'Missing Google Drive config: set GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY'
  );
}

/**
 * Get or create the root folder "Formula IHU Uploads" (or use GOOGLE_DRIVE_ROOT_FOLDER_ID if set).
 * Then get or create a subfolder for the team.
 */
async function getOrCreateTeamFolder(
  drive: drive_v3.Drive,
  rootFolderId: string | null,
  teamId: string,
  teamName: string
): Promise<string> {
  const folderName = `${teamName || teamId} (${teamId})`;

  // 1. Resolve root folder
  let rootId = rootFolderId ?? null;
  if (!rootId) {
    const escapedName = ROOT_FOLDER_NAME.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const list = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    const existing = list.data.files?.[0];
    if (existing?.id) {
      rootId = existing.id;
    } else {
      const create = await drive.files.create({
        requestBody: {
          name: ROOT_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      rootId = create.data.id ?? null;
    }
  }

  if (!rootId) throw new Error('Could not get or create root folder');

  // 2. Get or create team subfolder (by name + id to avoid collisions)
  const escapedFolderName = folderName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const teamList = await drive.files.list({
    q: `'${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${escapedFolderName}' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  const teamFolder = teamList.data.files?.[0];
  if (teamFolder?.id) return teamFolder.id;

  const createTeam = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootId],
    },
    fields: 'id',
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
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null;
  console.log(`[Google Drive] Root folder ID from env: ${rootId ?? '(not set — will use service account Drive)'}`);

  const teamFolderId = await getOrCreateTeamFolder(
    drive,
    rootId,
    params.teamId,
    params.teamName
  );

  const mimeType = params.mimeType || 'application/octet-stream';
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
  });

  const fileId = res.data.id;
  if (!fileId) throw new Error('Drive upload did not return file id');
  return { fileId, webViewLink: res.data.webViewLink ?? undefined };
}
