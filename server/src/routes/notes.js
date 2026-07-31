import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

export const notesRouter = Router();
notesRouter.use(requireAuth);

const listStmt = db.prepare(
  `SELECT * FROM notes WHERE owner_id = ? AND entity_type = ? AND entity_id = ? ORDER BY created_at DESC`
);
const insertStmt = db.prepare(
  `INSERT INTO notes (id, owner_id, entity_type, entity_id, body) VALUES (@id, @owner_id, @entity_type, @entity_id, @body)`
);
const deleteStmt = db.prepare(`DELETE FROM notes WHERE id = ? AND owner_id = ?`);

// GET /api/notes?entity_type=contact&entity_id=xyz
notesRouter.get('/', (req, res) => {
  const { entity_type, entity_id } = req.query;
  if (!entity_type || !entity_id) {
    return res.status(400).json({ error: 'entity_type and entity_id are required' });
  }
  res.json(listStmt.all(req.user.id, entity_type, entity_id));
});

notesRouter.post('/', (req, res) => {
  const { entity_type, entity_id, body } = req.body ?? {};
  if (!entity_type || !entity_id || !body) {
    return res.status(400).json({ error: 'entity_type, entity_id and body are required' });
  }
  const record = { id: uuid(), owner_id: req.user.id, entity_type, entity_id, body };
  insertStmt.run(record);
  res.status(201).json(record);
});

notesRouter.delete('/:id', (req, res) => {
  const result = deleteStmt.run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});
