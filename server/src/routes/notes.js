import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { requireAuth, getAuthorizedClient } from '../auth.js';
import { listRows, appendRow, findRowById, deleteRow } from '../sheets.js';

export const notesRouter = Router();
notesRouter.use(requireAuth);

// GET /api/notes?entity_type=contact&entity_id=xyz
notesRouter.get('/', async (req, res, next) => {
  const { entity_type, entity_id } = req.query;
  if (!entity_type || !entity_id) {
    return res.status(400).json({ error: 'entity_type and entity_id are required' });
  }
  try {
    const client = getAuthorizedClient(req.sessionAuth);
    const rows = await listRows(client, req.spreadsheetId, 'notes');
    const items = rows
      .filter((r) => r.entity_type === entity_type && r.entity_id === entity_id)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .map(({ _row, ...rest }) => rest);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

notesRouter.post('/', async (req, res, next) => {
  const { entity_type, entity_id, body } = req.body ?? {};
  if (!entity_type || !entity_id || !body) {
    return res.status(400).json({ error: 'entity_type, entity_id and body are required' });
  }
  try {
    const client = getAuthorizedClient(req.sessionAuth);
    const record = { id: uuid(), entity_type, entity_id, body, created_at: new Date().toISOString() };
    await appendRow(client, req.spreadsheetId, 'notes', record);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

notesRouter.delete('/:id', async (req, res, next) => {
  try {
    const client = getAuthorizedClient(req.sessionAuth);
    const existing = await findRowById(client, req.spreadsheetId, 'notes', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await deleteRow(client, req.spreadsheetId, 'notes', existing._row);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
