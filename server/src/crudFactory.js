import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from './db.js';
import { requireAuth } from './auth.js';

/**
 * Builds an owner-scoped CRUD router for a single table. Every statement is
 * filtered by owner_id = req.user.id, so a signed-in Google account can only
 * ever see or mutate the CRM records it created.
 */
export function crudRouter({ table, columns, orderBy = 'created_at DESC' }) {
  const router = Router();
  router.use(requireAuth);

  const insertCols = ['id', 'owner_id', ...columns];
  const insertSql = `INSERT INTO ${table} (${insertCols.join(', ')}) VALUES (${insertCols.map((c) => '@' + c).join(', ')})`;
  const insertStmt = db.prepare(insertSql);

  const listStmt = db.prepare(`SELECT * FROM ${table} WHERE owner_id = ? ORDER BY ${orderBy}`);
  const getStmt = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND owner_id = ?`);
  const deleteStmt = db.prepare(`DELETE FROM ${table} WHERE id = ? AND owner_id = ?`);

  router.get('/', (req, res) => {
    res.json(listStmt.all(req.user.id));
  });

  router.get('/:id', (req, res) => {
    const row = getStmt.get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.post('/', (req, res) => {
    const record = { id: uuid(), owner_id: req.user.id };
    for (const col of columns) record[col] = req.body?.[col] ?? null;
    insertStmt.run(record);
    res.status(201).json(getStmt.get(record.id, req.user.id));
  });

  router.put('/:id', (req, res) => {
    const existing = getStmt.get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const sets = columns.map((c) => `${c} = @${c}`).join(', ');
    const updateStmt = db.prepare(
      `UPDATE ${table} SET ${sets}, updated_at = datetime('now') WHERE id = @id AND owner_id = @owner_id`
    );
    const record = { id: req.params.id, owner_id: req.user.id };
    for (const col of columns) {
      record[col] = req.body?.[col] !== undefined ? req.body[col] : existing[col];
    }
    updateStmt.run(record);
    res.json(getStmt.get(req.params.id, req.user.id));
  });

  router.delete('/:id', (req, res) => {
    const result = deleteStmt.run(req.params.id, req.user.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  });

  return router;
}
