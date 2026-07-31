import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { encrypt, decrypt } from './crypto.js';
import { findOrCreateSpreadsheet } from './sheets.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_COOKIE = 'crm_session';
const OAUTH_STATE_COOKIE = 'g_oauth_state';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const SERVER_ORIGIN = process.env.SERVER_ORIGIN || `http://localhost:${process.env.PORT || 3001}`;
const GOOGLE_REDIRECT_URI = `${SERVER_ORIGIN}/api/auth/google/callback`;

// Scopes: identity (openid/email/profile) plus just enough Drive/Sheets
// access to create and manage the one spreadsheet this app uses as each
// user's CRM database. `drive.file` is the narrow Drive scope — it only
// ever sees files this app itself created, never the rest of the user's
// Drive. `spreadsheets` is required for reading/writing cell values (Sheets
// API has no per-file-restricted equivalent of drive.file).
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
];

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn('[auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google sign-in will fail.');
}
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in the environment.');
}

function newOAuthClient() {
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

/** Builds the URL that starts Google sign-in. */
export function getGoogleAuthUrl(state) {
  const client = newOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    // Force the consent screen (and a fresh refresh_token) on every login.
    // The server keeps no database, so the refresh token travels only in
    // this session's cookie — a new session always needs its own.
    prompt: 'consent',
    state,
  });
}

/**
 * Exchanges the OAuth `code` for tokens, verifies the ID token to get the
 * account's stable `sub`/email/name/picture, and finds or creates that
 * account's own CRM spreadsheet (in the user's own Drive, under their own
 * quota — this call uses the user's freshly authorized client, not a
 * service account). Returns everything issueSessionToken needs.
 */
export async function handleGoogleOAuthCallback(code) {
  const client = newOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new Error('Google did not return an id_token');
  }
  if (!tokens.refresh_token) {
    throw new Error('Google did not return a refresh_token (missing offline access / consent)');
  }

  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error('Invalid Google ID token payload');
  }
  if (!payload.email_verified) {
    throw new Error('Google account email is not verified');
  }

  client.setCredentials(tokens);
  const spreadsheetId = await findOrCreateSpreadsheet(client, payload.sub);

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
    refreshToken: tokens.refresh_token,
    spreadsheetId,
  };
}

/** Builds an OAuth2Client authorized for this session's Google account, for Sheets calls. */
export function getAuthorizedClient(sessionUser) {
  const client = newOAuthClient();
  client.setCredentials({ refresh_token: decrypt(sessionUser.erf) });
  return client;
}

export function issueSessionToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      spreadsheetId: user.spreadsheetId,
      erf: encrypt(user.refreshToken),
    },
    SESSION_SECRET,
    { expiresIn: '7d' }
  );
}

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function setOAuthStateCookie(res, state) {
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000,
    path: '/',
  });
}

export function readAndClearOAuthStateCookie(req, res) {
  const state = req.cookies?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
  return state;
}

/**
 * Express middleware: requires a valid session cookie. Attaches req.user
 * (public profile fields) and req.spreadsheetId — every CRM route reads
 * data from that one spreadsheet, i.e. from the signed-in Google account's
 * own Drive, so there's no owner_id column to filter on anymore; the
 * account boundary *is* the file boundary.
 */
export function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };
    req.sessionAuth = decoded; // includes erf (encrypted refresh token) for getAuthorizedClient
    req.spreadsheetId = decoded.spreadsheetId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
  };
}
