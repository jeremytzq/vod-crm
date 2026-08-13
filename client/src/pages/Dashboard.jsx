import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const currency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    Number(n) || 0
  );

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/dashboard/summary')
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Welcome back, {user?.name?.split(' ')[0] || 'there'}</h1>
      <p className="text-sm text-gray-500 mb-6">
        This CRM is scoped to your Google account ({user?.email}) — only you can see this data.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!summary && !error && <p className="text-sm text-gray-500">Loading…</p>}

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Contacts" value={summary.contacts} />
            <StatCard label="Companies" value={summary.companies} />
            <StatCard label="Open tasks" value={summary.openTasks} />
            <StatCard label="Open pipeline value" value={currency(summary.pipelineValue)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="font-semibold mb-3">Pipeline by stage</h2>
              <div className="space-y-2">
                {summary.dealsByStage.map((s) => (
                  <div key={s.stage} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-gray-600">{s.stage}</span>
                    <span className="font-medium">
                      {s.n} · {currency(s.total_value)}
                    </span>
                  </div>
                ))}
                {summary.dealsByStage.length === 0 && (
                  <p className="text-sm text-gray-500">No deals yet.</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="font-semibold mb-3">Recently updated deals</h2>
              <div className="space-y-2">
                {summary.recentDeals.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{d.title}</span>
                    <span className="text-gray-500">{currency(d.value)}</span>
                  </div>
                ))}
                {summary.recentDeals.length === 0 && (
                  <p className="text-sm text-gray-500">No deals yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
