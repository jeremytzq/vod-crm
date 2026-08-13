import { crudRouter } from '../crudFactory.js';

export const tasksRouter = crudRouter({
  tab: 'tasks',
  fields: ['title', 'due_date', { name: 'done', type: 'boolean' }, 'contact_id', 'deal_id'],
  sort: (a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  },
});
