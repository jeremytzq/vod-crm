import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useResource } from '../hooks/useResource';
import EditableField from '../components/EditableField';
import Timeline from '../components/Timeline';

const CLIENT_TYPES = ['Hot', 'Warm', 'Cold'];
const LEAD_STAGES = ['New', 'Contacted', 'Appointment Booked', 'Proposal Sent', 'Won', 'Lost'];

function avatarColor(name) {
  let hash = 0;
  for (const ch of name || '?') hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);
  const { items: companies } = useResource('companies');

  const loadContact = useCallback(async () => {
    try {
      setContact(await api.get(`/contacts/${id}`));
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  const loadActivities = useCallback(async () => {
    const items = await api.get(`/notes?entity_type=contact&entity_id=${id}`);
    setActivities(items);
  }, [id]);

  useEffect(() => {
    loadContact();
    loadActivities();
  }, [loadContact, loadActivities]);

  const updateField = async (field, value) => {
    const updated = await api.put(`/contacts/${id}`, { ...contact, [field]: value });
    setContact(updated);
  };

  const addActivity = async ({ type, body }) => {
    await api.post('/notes', { entity_type: 'contact', entity_id: id, type, body });
    await loadActivities();
  };

  const deleteContact = async () => {
    if (!confirm(`Delete ${contact.name}? This can't be undone.`)) return;
    await api.del(`/contacts/${id}`);
    navigate('/contacts');
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!contact) return <p className="text-sm text-gray-500">Loading…</p>;

  const groups = (contact.groups || '')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);
  const company = companies.find((c) => c.id === contact.company_id);

  return (
    <div>
      <Link to="/contacts" className="text-sm text-brand-600 hover:underline">
        ← Back to contacts
      </Link>

      <div className="flex items-center gap-4 mt-3 mb-6">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold shrink-0"
          style={{ backgroundColor: avatarColor(contact.name) }}
        >
          {contact.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold truncate">{contact.name}</h1>
          {company && <p className="text-sm text-gray-500">{company.name}</p>}
        </div>
        <button
          onClick={deleteContact}
          className="ml-auto text-sm text-red-600 hover:underline shrink-0"
        >
          Delete contact
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-6 items-start">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          {groups.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {groups.map((g) => (
                <span
                  key={g}
                  className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-100 text-brand-700 uppercase"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          <EditableField label="Display Name" value={contact.name} onSave={(v) => updateField('name', v)} />
          <EditableField label="Mobile Number" value={contact.phone} onSave={(v) => updateField('phone', v)} />
          <EditableField
            label="WhatsApp Number"
            value={contact.whatsapp_number}
            onSave={(v) => updateField('whatsapp_number', v)}
          />
          <EditableField label="Email Address" value={contact.email} onSave={(v) => updateField('email', v)} />
          <EditableField label="Job Title" value={contact.title} onSave={(v) => updateField('title', v)} />
          <EditableField
            label="Client Type"
            value={contact.client_type}
            type="select"
            options={CLIENT_TYPES}
            onSave={(v) => updateField('client_type', v)}
          />
          <EditableField
            label="Lead Stage"
            value={contact.lead_stage}
            type="select"
            options={LEAD_STAGES}
            onSave={(v) => updateField('lead_stage', v)}
          />
          <EditableField
            label="Opportunity Size"
            value={contact.opportunity_size != null ? String(contact.opportunity_size) : ''}
            type="number"
            onSave={(v) => updateField('opportunity_size', v)}
          />
          <EditableField
            label="Project Interested"
            value={contact.project_interested}
            onSave={(v) => updateField('project_interested', v)}
          />
          <EditableField
            label="Birthday"
            value={contact.birthday}
            type="date"
            onSave={(v) => updateField('birthday', v)}
          />
          <EditableField
            label="Property Address"
            value={contact.property_address}
            type="textarea"
            onSave={(v) => updateField('property_address', v)}
          />
          <EditableField
            label="Correspondence Address"
            value={contact.correspondence_address}
            type="textarea"
            onSave={(v) => updateField('correspondence_address', v)}
          />
          <EditableField label="Cust Grade" value={contact.cust_grade} onSave={(v) => updateField('cust_grade', v)} />
          <EditableField
            label="Groups"
            value={contact.groups}
            placeholder="comma-separated, e.g. EC, NL"
            onSave={(v) => updateField('groups', v)}
          />
          <EditableField
            label="Notes"
            value={contact.notes}
            type="textarea"
            onSave={(v) => updateField('notes', v)}
          />
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-400 text-2xl mb-2">⚡</p>
            <p className="font-medium text-sm">Not currently part of any sequences</p>
            <p className="text-xs text-gray-500 mt-1">Automated sequences aren't set up in this CRM yet.</p>
          </div>
          <Timeline activities={activities} onAdd={addActivity} />
        </div>
      </div>
    </div>
  );
}
