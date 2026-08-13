import { useState } from 'react';

const TYPE_META = {
  message: { color: 'bg-blue-500', label: 'Message', icon: MessageIcon },
  call: { color: 'bg-violet-500', label: 'Phone Call', icon: PhoneIcon },
  whatsapp: { color: 'bg-emerald-500', label: 'WhatsApp', icon: ChatIcon },
  system: { color: 'bg-gray-400', label: 'System', icon: SystemIcon },
  note: { color: 'bg-amber-500', label: 'Note', icon: NoteIcon },
};

function formatTimestamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function Timeline({ activities, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState('note');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      await onAdd({ type, body: body.trim() });
      setBody('');
      setType('note');
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-lg">Timeline</h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          <span className="text-lg leading-none">+</span> Add Activity
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="mb-4 border border-gray-200 rounded-md p-3 space-y-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          >
            {Object.entries(TYPE_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <textarea
            autoFocus
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What happened?"
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 text-sm rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </form>
      )}

      <div className="relative">
        {activities.map((a, i) => {
          const meta = TYPE_META[a.type] || TYPE_META.note;
          const Icon = meta.icon;
          const isLast = i === activities.length - 1;
          return (
            <div key={a.id} className="relative flex gap-3 pb-5">
              {!isLast && <span className="absolute left-4 top-8 bottom-0 w-px bg-gray-200" />}
              <div
                className={`relative z-10 shrink-0 w-8 h-8 rounded-full ${meta.color} text-white flex items-center justify-center`}
              >
                <Icon />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-xs text-gray-400">{formatTimestamp(a.created_at)}</p>
                <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">{a.body}</p>
              </div>
            </div>
          );
        })}
        {activities.length === 0 && <p className="text-sm text-gray-500 py-4 text-center">No activity yet.</p>}
      </div>
    </div>
  );
}

function iconProps() {
  return { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 };
}

function MessageIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...iconProps()}>
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg {...iconProps()}>
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg {...iconProps()}>
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6M9 13h6M9 17h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
