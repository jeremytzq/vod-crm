import { crudRouter } from '../crudFactory.js';

export const DEAL_STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

export const dealsRouter = crudRouter({
  tab: 'deals',
  fields: [
    'title',
    'contact_id',
    'company_id',
    { name: 'value', type: 'number' },
    'stage',
    'close_date',
    'notes',
  ],
  sort: (a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''),
});
