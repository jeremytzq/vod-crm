import { crudRouter } from '../crudFactory.js';

export const companiesRouter = crudRouter({
  table: 'companies',
  columns: ['name', 'domain', 'industry', 'notes'],
  orderBy: 'name ASC',
});
