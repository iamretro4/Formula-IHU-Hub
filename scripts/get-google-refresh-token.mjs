#!/usr/bin/env node
/**
 * One-time script to generate a Google OAuth2 refresh token.
 *
 * Prerequisites:
 *   1. Go to https://console.cloud.google.com/apis/credentials
 *      (project: inspection-site-2e66e)
 *   2. Create an OAuth 2.0 Client ID (type: "Web application")
 *      - Add http://localhost:3333 to "Authorized redirect URIs"
 *   3. Copy the Client ID and Client Secret
 *   4. Make sure the Google Drive API is enabled for the project:
 *      https://console.cloud.google.com/apis/library/drive.googleapis.com
 *
 * Usage:
 *   node scripts/get-google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>
 *
 * It will open your browser to sign in. After granting access, you'll get
 * a refresh token to paste into your .env.local / Vercel env vars.
 */

import http from 'node:http';
import { execSync } from 'node:child_process';

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\nUsage: node scripts/get-google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>\n');
  console.error('Get these from: https://console.cloud.google.com/apis/credentials');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3333';
const SCOPES = 'https://www.googleapis.com/auth/drive';

// Build the auth URL
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('\n🔑 Google OAuth2 Refresh Token Generator\n');
console.log('Opening your browser to sign in with Google...\n');

// Start a temporary HTTP server to receive the callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<h1>Error: ${error}</h1><p>You can close this tab.</p>`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Waiting for auth code...</h1>');
    return;
  }

  // Exchange the code for tokens
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<h1>Token error: ${tokens.error}</h1><p>${tokens.error_description || ''}</p>`);
      server.close();
      process.exit(1);
    }

    const refreshToken = tokens.refresh_token;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>✅ Success!</h1>
      <p>Refresh token has been printed in your terminal. You can close this tab.</p>
    `);

    console.log('✅ Success! Here are your credentials:\n');
    console.log('Add these to your .env.local and Vercel environment variables:\n');
    console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${refreshToken}`);
    console.log('');

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h1>Error exchanging code</h1><pre>${err.message}</pre>`);
    server.close();
    process.exit(1);
  }
});

server.listen(3333, () => {
  // Open browser
  const openCmd =
    process.platform === 'darwin' ? 'open' :
    process.platform === 'win32' ? 'start' : 'xdg-open';

  try {
    execSync(`${openCmd} "${authUrl.toString()}"`);
  } catch {
    console.log(`Open this URL in your browser:\n\n${authUrl.toString()}\n`);
  }
});
