import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuid } from 'uuid';
import { db } from './db.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_COOKIE = 'crm_session';
const OAUTH_STATE_COOKIE = 'g_oauth_state';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const SERVER_ORIGIN = process.env.SERVER_ORIGIN || `http://localhost:${process.env.PORT || 3001}`;
const GOOGLE_REDIRECT_URI = `${SERVER_ORIGIN}/api/auth/google/callback`;

if (!GOOGLE_CLIENT_ID) {
  console.warn('[auth] GOOGLE_CLIENT_ID is not set — Google sign-in will fail.');
}
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in the environment.');
}

// One client handles both sign-in paths: verifying the ID token posted by
// the Google Identity Services button, and the classic OAuth redirect flow
// used as a fallback when that button fails to load (ad blockers, strict
// third-party-cookie settings, older browsers, etc). The redirect flow needs
// a client secret because it's a confidential (server-side) OAuth client.
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

const upsertUserStmt = db.prepare(`
  INSERT INTO users (id, google_sub, email, name, picture)
  VALUES (@id, @google_sub, @email, @name, @picture)
  ON CONFLICT(google_sub) DO UPDATE SET
    email = excluded.email,
    name = excluded.name,
    picture = excluded.picture,
    last_login_at = datetime('now')
`);

const findByGoogleSubStmt = db.prepare('SELECT * FROM users WHERE google_sub = ?');
const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');

/**
 * Verifies a Google ID token (the `credential` returned by Google Identity
 * Services on the client) and upserts the corresponding local user record,
 * keyed by the Google account's stable `sub` claim. This is what ties every
 * CRM record to one specific Google account.
 */
export async function verifyGoogleCredential(credential) {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error('Invalid Google credential payload');
  }
  if (!payload.email_verified) {
    throw new Error('Google account email is not verified');
  }

  const existing = findByGoogleSubStmt.get(payload.sub);
  const user = {
    id: existing?.id ?? uuid(),
    google_sub: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
  upsertUserStmt.run(user);
  return findByIdStmt.get(user.id);
}

/** Builds the URL that starts the redirect-based Google sign-in fallback. */
export function getGoogleAuthUrl(state) {
  return googleClient.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    state,
  });
}

/** Exchanges an OAuth redirect `code` for tokens and upserts the user. */
export async function handleGoogleOAuthCallback(code) {
  const { tokens } = await googleClient.getToken(code);
  if (!tokens.id_token) {
    throw new Error('Google did not return an id_token');
  }
  return verifyGoogleCredential(tokens.id_token);
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

export function issueSessionToken(user) {
  return jwt.sign({ sub: user.id }, SESSION_SECRET, { expiresIn: '7d' });
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

/** Express middleware: requires a valid session cookie, attaches req.user. */
export function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    const user = findByIdStmt.get(decoded.sub);
    if (!user) {
      return res.status(401).json({ error: 'Session user not found' });
    }
    req.user = user;
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
