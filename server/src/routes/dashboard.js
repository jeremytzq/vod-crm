import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

const countStmt = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE owner_id = ?`);
const contactsCount = countStmt('contacts');
const companiesCount = countStmt('companies');
const openTasksCount = db.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE owner_id = ? AND done = 0`);
const dealsByStage = db.prepare(
  `SELECT stage, COUNT(*) AS n, COALESCE(SUM(value), 0) AS total_value
   FROM deals WHERE owner_id = ? GROUP BY stage`
);
const pipelineValue = db.prepare(
  `SELECT COALESCE(SUM(value), 0) AS total FROM deals WHERE owner_id = ? AND stage NOT IN ('won', 'lost')`
);
const recentDeals = db.prepare(
  `SELECT id, title, value, stage, updated_at FROM deals WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 5`
);

dashboardRouter.get('/summary', (req, res) => {
  const ownerId = req.user.id;
  res.json({
    contacts: contactsCount.get(ownerId).n,
    companies: companiesCount.get(ownerId).n,
    openTasks: openTasksCount.get(ownerId).n,
    pipelineValue: pipelineValue.get(ownerId).total,
    dealsByStage: dealsByStage.all(ownerId),
    recentDeals: recentDeals.all(ownerId),
  });
});
