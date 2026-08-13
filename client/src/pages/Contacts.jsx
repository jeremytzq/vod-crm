import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useResource } from '../hooks/useResource';
import Modal from '../components/Modal';
import RecordForm from '../components/RecordForm';

const fields = [
  { name: 'name', label: 'Full name', required: true },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Mobile number' },
];

export default function Contacts() {
  const { items, loading, error, create, remove } = useResource('contacts');
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Contacts</h1>
        <button
          onClick={() => setCreating(true)}
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
            <Link to={`/contacts/${c.id}`} className="min-w-0 hover:underline">
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-gray-500">
                {[c.lead_stage, c.title, c.email].filter(Boolean).join(' · ') || '—'}
              </p>
            </Link>
            <button
              onClick={() => remove(c.id)}
              className="text-sm text-red-600 hover:underline shrink-0 ml-3"
            >
              Delete
            </button>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">No contacts yet.</p>
        )}
      </div>

      {creating && (
        <Modal title="New contact" onClose={() => setCreating(false)}>
          <RecordForm
            fields={fields}
            onCancel={() => setCreating(false)}
            onSubmit={async (values) => {
              await create(values);
              setCreating(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
