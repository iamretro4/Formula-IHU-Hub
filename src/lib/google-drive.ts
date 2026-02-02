/**
 * Google Drive sync: ensure team subfolder exists and upload file.
 * Uses a service account. Set GOOGLE_DRIVE_ROOT_FOLDER_ID to a folder shared with the service account (Editor).
 */

import { Readable } from 'stream';
import { google, drive_v3 } from 'googleapis';

const ROOT_FOLDER_NAME = 'Formula IHU Uploads';

/** Normalize PEM private key from env (handles \n, \\n, and line endings). */
function normalizePrivateKey(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function getAuth() {
  const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;

  if (json) {
    try {
      const credentials = typeof json === 'string' ? JSON.parse(json) : json;
      const privateKey = normalizePrivateKey(credentials.private_key || '');
      if (!privateKey) throw new Error('Missing private_key in JSON');
      return new google.auth.GoogleAuth({
        credentials: {
          client_email: credentials.client_email,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });
    } catch (e) {
      throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON');
    }
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
