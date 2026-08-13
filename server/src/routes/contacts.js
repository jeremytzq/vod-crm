import { crudRouter } from '../crudFactory.js';

export const CLIENT_TYPES = ['Hot', 'Warm', 'Cold'];
export const LEAD_STAGES = ['New', 'Contacted', 'Appointment Booked', 'Proposal Sent', 'Won', 'Lost'];

export const contactsRouter = crudRouter({
  tab: 'contacts',
  fields: [
    'name',
    'email',
    'phone',
    'whatsapp_number',
    'title',
    'company_id',
    'client_type',
    'lead_stage',
    { name: 'opportunity_size', type: 'number' },
    'project_interested',
    'birthday',
    'property_address',
    'correspondence_address',
    'cust_grade',
    'groups',
    'notes',
  ],
  sort: (a, b) => a.name.localeCompare(b.name),
});
