const https = require('https');
const querystring = require('querystring');
const googleConfig = require('../config/google');
const { db } = require('../config/database');
const { formatE164 } = require('../utils/phoneFormat');
const logger = require('../utils/logger');

/**
 * Generate the Google OAuth2 consent URL.
 */
function getAuthUrl() {
  const params = querystring.stringify({
    client_id: googleConfig.oauth.clientId,
    redirect_uri: googleConfig.oauth.redirectUri,
    response_type: 'code',
    scope: googleConfig.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Make an HTTPS request and return parsed JSON.
 */
function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
async function exchangeCode(code) {
  const postData = querystring.stringify({
    code,
    client_id: googleConfig.oauth.clientId,
    client_secret: googleConfig.oauth.clientSecret,
    redirect_uri: googleConfig.oauth.redirectUri,
    grant_type: 'authorization_code',
  });

  const tokens = await httpsRequest(
    {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    },
    postData
  );

  // Store tokens in the global settings under the "google" key
  const row = await db('settings').where({ key_: 'global' }).first();
  const settings = row ? (typeof row.data === 'string' ? JSON.parse(row.data) : row.data) : {};
  settings.google = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || (settings.google && settings.google.refreshToken),
    expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
    connectedAt: new Date().toISOString(),
  };

  if (row) {
    await db('settings').where({ key_: 'global' }).update({ data: JSON.stringify(settings) });
  } else {
    await db('settings').insert({ key_: 'global', data: JSON.stringify(settings) });
  }

  return tokens;
}

/**
 * Import contacts from Google People API.
 * Fetches all connections with names and phone numbers,
 * formats phones to E.164 and upserts into the contacts DB.
 */
async function importContacts(accessToken) {
  let imported = 0;
  let skipped = 0;
  let total = 0;
  let nextPageToken = null;

  do {
    const params = new URLSearchParams({
      personFields: 'names,phoneNumbers',
      pageSize: '1000',
    });
    if (nextPageToken) {
      params.set('pageToken', nextPageToken);
    }

    const result = await httpsRequest({
      hostname: 'people.googleapis.com',
      path: `/v1/people/me/connections?${params.toString()}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const connections = result.connections || [];

    for (const person of connections) {
      const names = person.names || [];
      const phones = person.phoneNumbers || [];

      if (!phones.length) continue;

      const displayName = names.length
        ? (names[0].displayName || `${names[0].givenName || ''} ${names[0].familyName || ''}`.trim())
        : '';
      const firstName = names.length ? (names[0].givenName || '') : '';
      const lastName = names.length ? (names[0].familyName || '') : '';

      for (const phoneEntry of phones) {
        total++;
        const phone = formatE164(phoneEntry.value);

        if (!phone || phone.length < 8) {
          skipped++;
          continue;
        }

        try {
          // Check if contact with this phone already exists
          const existing = await db('contacts').where({ phone }).first();
          if (existing) {
            skipped++;
          } else {
            await db('contacts').insert({
              phone,
              display_name: displayName || phone,
              first_name: firstName,
              last_name: lastName,
              source: 'google',
            });
            imported++;
          }
        } catch (err) {
          logger.warn(`Google import: failed to upsert ${phone}: ${err.message}`);
          skipped++;
        }
      }
    }

    nextPageToken = result.nextPageToken || null;
  } while (nextPageToken);

  logger.info(`Google Contacts import complete: ${imported} imported, ${skipped} skipped, ${total} total`);

  return { imported, skipped, total };
}

module.exports = { getAuthUrl, exchangeCode, importContacts };
