import { Router } from 'express';
import { requireAuth, getAuthorizedClient } from '../auth.js';
import { listRows } from '../sheets.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/summary', async (req, res, next) => {
  try {
    const client = getAuthorizedClient(req.sessionAuth);
    const [contacts, companies, deals, tasks] = await Promise.all([
      listRows(client, req.spreadsheetId, 'contacts'),
      listRows(client, req.spreadsheetId, 'companies'),
      listRows(client, req.spreadsheetId, 'deals'),
      listRows(client, req.spreadsheetId, 'tasks'),
    ]);

    const dealValue = (d) => Number(d.value) || 0;
    const openTasks = tasks.filter((t) => t.done !== 'true' && t.done !== true).length;
    const openDeals = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost');
    const pipelineValue = openDeals.reduce((sum, d) => sum + dealValue(d), 0);

    const stageTotals = new Map();
    for (const d of deals) {
      const entry = stageTotals.get(d.stage) || { stage: d.stage, n: 0, total_value: 0 };
      entry.n += 1;
      entry.total_value += dealValue(d);
      stageTotals.set(d.stage, entry);
    }

    const recentDeals = [...deals]
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
      .slice(0, 5)
      .map((d) => ({ id: d.id, title: d.title, value: dealValue(d), stage: d.stage, updated_at: d.updated_at }));

    res.json({
      contacts: contacts.length,
      companies: companies.length,
      openTasks,
      pipelineValue,
      dealsByStage: [...stageTotals.values()],
      recentDeals,
    });
  } catch (err) {
    next(err);
  }
});
