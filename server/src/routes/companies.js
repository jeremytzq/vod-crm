import { crudRouter } from '../crudFactory.js';

export const companiesRouter = crudRouter({
  tab: 'companies',
  fields: ['name', 'domain', 'industry', 'notes'],
  sort: (a, b) => a.name.localeCompare(b.name),
});
