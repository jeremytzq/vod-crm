import { Router } from 'express';
import {
  verifyGoogleCredential,
  issueSessionToken,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  publicUser,
} from '../auth.js';

export const authRouter = Router();

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

authRouter.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});
