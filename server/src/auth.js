import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuid } from 'uuid';
import { db } from './db.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_COOKIE = 'crm_session';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

if (!GOOGLE_CLIENT_ID) {
  console.warn('[auth] GOOGLE_CLIENT_ID is not set — Google sign-in will fail.');
}
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in the environment.');
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
