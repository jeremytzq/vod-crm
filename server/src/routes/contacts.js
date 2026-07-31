import { crudRouter } from '../crudFactory.js';

export const contactsRouter = crudRouter({
  tab: 'contacts',
  fields: ['company_id', 'name', 'email', 'phone', 'title', 'notes'],
  sort: (a, b) => a.name.localeCompare(b.name),
});
