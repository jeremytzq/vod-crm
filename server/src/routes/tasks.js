import { crudRouter } from '../crudFactory.js';

export const tasksRouter = crudRouter({
  table: 'tasks',
  columns: ['title', 'due_date', 'done', 'contact_id', 'deal_id'],
  orderBy: "done ASC, due_date IS NULL, due_date ASC",
});
