import { useState } from 'react';

export default function RecordForm({ fields, initial = {}, onSubmit, onCancel, submitLabel = 'Save' }) {
  const [values, setValues] = useState(() => {
    const base = {};
    for (const f of fields) base[f.name] = initial[f.name] ?? (f.type === 'checkbox' ? false : '');
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((f) => (
        <div key={f.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
          {f.type === 'select' ? (
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={values[f.name]}
              onChange={(e) => handleChange(f.name, e.target.value)}
              required={f.required}
            >
              <option value="">{f.placeholder || 'Select...'}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={3}
              value={values[f.name]}
              onChange={(e) => handleChange(f.name, e.target.value)}
            />
          ) : f.type === 'checkbox' ? (
            <input
              type="checkbox"
              checked={!!values[f.name]}
              onChange={(e) => handleChange(f.name, e.target.checked)}
            />
          ) : (
            <input
              type={f.type || 'text'}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={values[f.name]}
              onChange={(e) => handleChange(f.name, e.target.value)}
              required={f.required}
            />
          )}
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
