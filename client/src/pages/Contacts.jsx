import { useState } from 'react';
import { useResource } from '../hooks/useResource';
import Modal from '../components/Modal';
import RecordForm from '../components/RecordForm';

export default function Contacts() {
  const { items, loading, error, create, update, remove } = useResource('contacts');
  const { items: companies } = useResource('companies');
  const [editing, setEditing] = useState(null);

  const fields = [
    { name: 'name', label: 'Full name', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone' },
    { name: 'title', label: 'Job title' },
    {
      name: 'company_id',
      label: 'Company',
      type: 'select',
      options: companies.map((c) => ({ value: c.id, label: c.name })),
    },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const companyName = (id) => companies.find((c) => c.id === id)?.name;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Contacts</h1>
        <button
          onClick={() => setEditing({})}
          className="px-4 py-2 text-sm rounded-md bg-brand-600 text-white hover:bg-brand-700"
        >
          + New contact
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-lg divide-y">
        {items.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-gray-500">
                {[c.title, companyName(c.company_id), c.email].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(c)} className="text-sm text-brand-600 hover:underline">
                Edit
              </button>
              <button onClick={() => remove(c.id)} className="text-sm text-red-600 hover:underline">
                Delete
              </button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">No contacts yet.</p>
        )}
      </div>

      {editing !== null && (
        <Modal title={editing.id ? 'Edit contact' : 'New contact'} onClose={() => setEditing(null)}>
          <RecordForm
            fields={fields}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              if (editing.id) await update(editing.id, values);
              else await create(values);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
