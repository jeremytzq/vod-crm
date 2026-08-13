import { useEffect, useRef, useState } from 'react';

// A Privyr-style label/value row that turns into an inline input on click
// and saves on blur or Enter. `type` picks the editor: text, textarea,
// select, date, or number.
export default function EditableField({ label, value, onSave, type = 'text', options, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== (value ?? '')) onSave(draft);
  };

  const cancel = () => {
    setDraft(value ?? '');
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && type !== 'textarea') commit();
    if (e.key === 'Escape') cancel();
  };

  // A native <select> doesn't reliably blur right after an option is
  // picked, which would otherwise delay the save until the user clicks
  // away. Commit immediately using the fresh value instead of relying on
  // (async, one-render-behind) draft state.
  const handleSelectChange = (e) => {
    const next = e.target.value;
    setDraft(next);
    setEditing(false);
    if (next !== (value ?? '')) onSave(next);
  };

  return (
    <div className="py-2.5 border-b border-gray-100 last:border-b-0">
      <p className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase mb-1">{label}</p>
      {editing ? (
        type === 'select' ? (
          <select
            ref={inputRef}
            className="w-full border border-brand-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={draft}
            onChange={handleSelectChange}
            onKeyDown={handleKeyDown}
          >
            <option value="">—</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            ref={inputRef}
            className="w-full border border-brand-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <input
            ref={inputRef}
            type={type}
            className="w-full border border-brand-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full text-left text-sm text-gray-900 hover:bg-gray-50 rounded-md px-1 -mx-1 py-0.5 whitespace-pre-wrap break-words"
        >
          {value ? value : <span className="text-gray-400 italic">Click to enter a value…</span>}
        </button>
      )}
    </div>
  );
}
