import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { authRouter } from './routes/auth.js';
import { contactsRouter } from './routes/contacts.js';
import { companiesRouter } from './routes/companies.js';
import { dealsRouter } from './routes/deals.js';
import { tasksRouter } from './routes/tasks.js';
import { notesRouter } from './routes/notes.js';
import { dashboardRouter } from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/notes', notesRouter);
app.use('/api/dashboard', dashboardRouter);

// Serve the built React client from this same server (populated at build
// time by the "vercel-build" script — see package.json) so one deployment
// and one URL covers both the API and the UI, with no separate hosting to
// configure. Falls back to index.html for any non-API path so client-side
// routing (react-router) works on a hard refresh/direct link.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '..', 'public');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next(err);
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;

// Vercel (and similar serverless platforms) import this module for its
// default export and invoke it per-request themselves — calling listen()
// there would be pointless and can interfere with that. Only bind a port
// for traditional "always-on" hosting (local dev, Render, Fly, etc).
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`CRM server listening on http://localhost:${PORT}`);
  });
}
