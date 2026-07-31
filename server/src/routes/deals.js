import { crudRouter } from '../crudFactory.js';

export const DEAL_STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

export const dealsRouter = crudRouter({
  table: 'deals',
  columns: ['title', 'contact_id', 'company_id', 'value', 'stage', 'close_date', 'notes'],
  orderBy: 'updated_at DESC',
});
