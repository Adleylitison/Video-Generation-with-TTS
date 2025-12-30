import { google } from 'googleapis';
import fs from 'fs';
import { Readable } from 'stream';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

async function getGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export interface UploadVideoResult {
  fileId: string;
  webViewLink: string;
  webContentLink: string;
}

export async function uploadVideoToDrive(
  filePath: string,
  fileName: string
): Promise<UploadVideoResult> {
  const drive = await getGoogleDriveClient();

  const fileMetadata = {
    name: fileName,
    mimeType: 'video/mp4',
  };

  const media = {
    mimeType: 'video/mp4',
    body: fs.createReadStream(filePath),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, webViewLink, webContentLink',
  });

  await drive.permissions.create({
    fileId: response.data.id!,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return {
    fileId: response.data.id!,
    webViewLink: response.data.webViewLink!,
    webContentLink: response.data.webContentLink!,
  };
}

export async function getVideoStream(fileId: string): Promise<Readable> {
  const drive = await getGoogleDriveClient();

  const response = await drive.files.get(
    {
      fileId: fileId,
      alt: 'media',
    },
    { responseType: 'stream' }
  );

  return response.data as unknown as Readable;
}

export async function deleteVideoFromDrive(fileId: string): Promise<void> {
  const drive = await getGoogleDriveClient();
  await drive.files.delete({ fileId });
}
