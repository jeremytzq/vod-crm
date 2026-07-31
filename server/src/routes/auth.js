import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import {
  verifyGoogleCredential,
  getGoogleAuthUrl,
  handleGoogleOAuthCallback,
  setOAuthStateCookie,
  readAndClearOAuthStateCookie,
  issueSessionToken,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  publicUser,
} from '../auth.js';

export const authRouter = Router();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Frontend posts the Google Identity Services `credential` (ID token) here.
authRouter.post('/google', async (req, res) => {
  const { credential } = req.body ?? {};
  if (!credential) {
    return res.status(400).json({ error: 'Missing credential' });
  }
  try {
    const user = await verifyGoogleCredential(credential);
    const token = issueSessionToken(user);
    setSessionCookie(res, token);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('[auth/google]', err.message);
    res.status(401).json({ error: 'Google sign-in failed' });
  }
});

// Fallback sign-in path for when the Google Identity Services button never
// loads (blocked script, third-party-cookie restrictions, etc). A plain
// link to this route always works because it's a full-page redirect to
// Google, not something that depends on a JS widget rendering client-side.
authRouter.get('/google/redirect', (req, res) => {
  const state = uuid();
  setOAuthStateCookie(res, state);
  res.redirect(getGoogleAuthUrl(state));
});

authRouter.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const expectedState = readAndClearOAuthStateCookie(req, res);

  if (error) {
    return res.redirect(`${CLIENT_ORIGIN}/?authError=denied`);
  }
  if (!code || !state || state !== expectedState) {
    return res.redirect(`${CLIENT_ORIGIN}/?authError=invalid_state`);
  }
  try {
    const user = await handleGoogleOAuthCallback(code);
    const token = issueSessionToken(user);
    setSessionCookie(res, token);
    res.redirect(CLIENT_ORIGIN);
  } catch (err) {
    console.error('[auth/google/callback]', err.message);
    res.redirect(`${CLIENT_ORIGIN}/?authError=failed`);
  }
});

authRouter.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});
