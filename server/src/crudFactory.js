import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { requireAuth, getAuthorizedClient } from './auth.js';
import { listRows, appendRow, updateRow, deleteRow, findRowById } from './sheets.js';

function normalizeField(field) {
  return typeof field === 'string' ? { name: field, type: 'string' } : field;
}

// Sheets stores everything as text, so numbers/booleans need explicit
// coercion in both directions or e.g. the string "0" (falsy nowhere in
// JS-land except as a real 0) would render as a checked checkbox.
function toSheetValue(value, type) {
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'number') return value === '' || value == null ? '' : String(value);
  return value ?? '';
}

function fromSheetValue(value, type) {
  if (type === 'boolean') return value === 'true' || value === true || value === '1';
  if (type === 'number') return value === '' || value == null ? null : Number(value);
  return value ?? '';
}

/**
 * Builds an owner-scoped CRUD router for one tab of the signed-in Google
 * account's own CRM spreadsheet. "Owner-scoped" here is automatic: every
 * request already carries req.spreadsheetId for exactly one account (see
 * requireAuth in auth.js), so there's no cross-account row to accidentally
 * touch — the account boundary is the file boundary.
 */
export function crudRouter({ tab, fields, sort }) {
  const router = Router();
  router.use(requireAuth);
  const columns = fields.map(normalizeField);

  function serialize(row) {
    const out = { id: row.id, created_at: row.created_at, updated_at: row.updated_at };
    for (const col of columns) out[col.name] = fromSheetValue(row[col.name], col.type);
    return out;
  }

  router.get('/', async (req, res, next) => {
    try {
      const client = getAuthorizedClient(req.sessionAuth);
      const rows = await listRows(client, req.spreadsheetId, tab);
      const items = rows.map(serialize);
      if (sort) items.sort(sort);
      res.json(items);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const client = getAuthorizedClient(req.sessionAuth);
      const row = await findRowById(client, req.spreadsheetId, tab, req.params.id);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(serialize(row));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const client = getAuthorizedClient(req.sessionAuth);
      const now = new Date().toISOString();
      const record = { id: uuid(), created_at: now, updated_at: now };
      for (const col of columns) record[col.name] = toSheetValue(req.body?.[col.name], col.type);
      await appendRow(client, req.spreadsheetId, tab, record);
      res.status(201).json(serialize(record));
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const client = getAuthorizedClient(req.sessionAuth);
      const existing = await findRowById(client, req.spreadsheetId, tab, req.params.id);
      if (!existing) return res.status(404).json({ error: 'Not found' });

      const record = { id: existing.id, created_at: existing.created_at, updated_at: new Date().toISOString() };
      for (const col of columns) {
        const incoming = req.body?.[col.name];
        record[col.name] = incoming !== undefined ? toSheetValue(incoming, col.type) : existing[col.name];
      }
      await updateRow(client, req.spreadsheetId, tab, existing._row, record);
      res.json(serialize(record));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const client = getAuthorizedClient(req.sessionAuth);
      const existing = await findRowById(client, req.spreadsheetId, tab, req.params.id);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      await deleteRow(client, req.spreadsheetId, tab, existing._row);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
