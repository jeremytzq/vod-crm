import { useState } from 'react';
import { useResource } from '../hooks/useResource';
import Modal from '../components/Modal';
import RecordForm from '../components/RecordForm';

const fields = [
  { name: 'name', label: 'Company name', required: true },
  { name: 'domain', label: 'Website / domain' },
  { name: 'industry', label: 'Industry' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Companies() {
  const { items, loading, error, create, update, remove } = useResource('companies');
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = edit

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Companies</h1>
        <button
          onClick={() => setEditing({})}
          className="px-4 py-2 text-sm rounded-md bg-brand-600 text-white hover:bg-brand-700"
        >
          + New company
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-lg divide-y">
        {items.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-gray-500">{c.domain || c.industry || '—'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(c)} className="text-sm text-brand-600 hover:underline">
                Edit
              </button>
              <button
                onClick={() => remove(c.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">No companies yet.</p>
        )}
      </div>

      {editing !== null && (
        <Modal title={editing.id ? 'Edit company' : 'New company'} onClose={() => setEditing(null)}>
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
