import { crudRouter } from '../crudFactory.js';

export const contactsRouter = crudRouter({
  table: 'contacts',
  columns: ['company_id', 'name', 'email', 'phone', 'title', 'notes'],
  orderBy: 'name ASC',
});
