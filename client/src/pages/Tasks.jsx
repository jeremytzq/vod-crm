import { useState } from 'react';
import { useResource } from '../hooks/useResource';
import Modal from '../components/Modal';
import RecordForm from '../components/RecordForm';

export default function Tasks() {
  const { items, loading, error, create, update, remove } = useResource('tasks');
  const { items: contacts } = useResource('contacts');
  const [editing, setEditing] = useState(null);

  const fields = [
    { name: 'title', label: 'Task', required: true },
    { name: 'due_date', label: 'Due date', type: 'date' },
    {
      name: 'contact_id',
      label: 'Related contact',
      type: 'select',
      options: contacts.map((c) => ({ value: c.id, label: c.name })),
    },
  ];

  const contactName = (id) => contacts.find((c) => c.id === id)?.name;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Tasks</h1>
        <button
          onClick={() => setEditing({})}
          className="px-4 py-2 text-sm rounded-md bg-brand-600 text-white hover:bg-brand-700"
        >
          + New task
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-lg divide-y">
        {items.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={!!t.done}
                onChange={() => update(t.id, { ...t, done: t.done ? 0 : 1 })}
              />
              <div>
                <p className={`font-medium ${t.done ? 'line-through text-gray-400' : ''}`}>{t.title}</p>
                <p className="text-sm text-gray-500">
                  {[t.due_date, contactName(t.contact_id)].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(t)} className="text-sm text-brand-600 hover:underline">
                Edit
              </button>
              <button onClick={() => remove(t.id)} className="text-sm text-red-600 hover:underline">
                Delete
              </button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">No tasks yet.</p>
        )}
      </div>

      {editing !== null && (
        <Modal title={editing.id ? 'Edit task' : 'New task'} onClose={() => setEditing(null)}>
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
