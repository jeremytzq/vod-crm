import { useState } from 'react';
import { useResource } from '../hooks/useResource';
import Modal from '../components/Modal';
import RecordForm from '../components/RecordForm';

const STAGES = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const currency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    Number(n) || 0
  );

export default function Deals() {
  const { items, loading, error, create, update, remove } = useResource('deals');
  const { items: contacts } = useResource('contacts');
  const { items: companies } = useResource('companies');
  const [editing, setEditing] = useState(null);

  const fields = [
    { name: 'title', label: 'Deal title', required: true },
    { name: 'value', label: 'Value (USD)', type: 'number' },
    { name: 'stage', label: 'Stage', type: 'select', options: STAGES, required: true },
    { name: 'close_date', label: 'Expected close date', type: 'date' },
    {
      name: 'contact_id',
      label: 'Contact',
      type: 'select',
      options: contacts.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      name: 'company_id',
      label: 'Company',
      type: 'select',
      options: companies.map((c) => ({ value: c.id, label: c.name })),
    },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const moveStage = (deal, direction) => {
    const idx = STAGES.findIndex((s) => s.value === deal.stage);
    const next = STAGES[idx + direction];
    if (next) update(deal.id, { ...deal, stage: next.value });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Deals</h1>
        <button
          onClick={() => setEditing({})}
          className="px-4 py-2 text-sm rounded-md bg-brand-600 text-white hover:bg-brand-700"
        >
          + New deal
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {STAGES.map((stage, idx) => {
          const stageDeals = items.filter((d) => d.stage === stage.value);
          return (
            <div key={stage.value} className="bg-gray-100 rounded-lg p-2 min-h-[120px]">
              <p className="text-xs font-semibold uppercase text-gray-500 px-1 mb-2">
                {stage.label} ({stageDeals.length})
              </p>
              <div className="space-y-2">
                {stageDeals.map((d) => (
                  <div key={d.id} className="bg-white rounded-md shadow-sm border border-gray-200 p-3">
                    <p className="text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{currency(d.value)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveStage(d, -1)}
                          disabled={idx === 0}
                          className="text-xs px-1.5 py-0.5 border rounded disabled:opacity-30"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => moveStage(d, 1)}
                          disabled={idx === STAGES.length - 1}
                          className="text-xs px-1.5 py-0.5 border rounded disabled:opacity-30"
                        >
                          →
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(d)} className="text-xs text-brand-600 hover:underline">
                          Edit
                        </button>
                        <button onClick={() => remove(d.id)} className="text-xs text-red-600 hover:underline">
                          Del
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {editing !== null && (
        <Modal title={editing.id ? 'Edit deal' : 'New deal'} onClose={() => setEditing(null)}>
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
