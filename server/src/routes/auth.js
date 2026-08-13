import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import {
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

// Sign-in is a single, plain full-page redirect through Google's standard
// OAuth consent screen — no client-side JS widget involved, so it can't
// fail to render the way a script-injected button can. It also requests
// Drive/Sheets scopes (needed to create/use this account's CRM
// spreadsheet), which a client-side ID-token-only flow can't grant.
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
