import { Link } from 'react-router-dom';
import { Plus, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { can } from '@/features/auth/roles';
import { useOpenAssignments } from '@/features/assignments/api';
import { useAssetStats, useDueMaintenance, useRecentActivity, useWarrantyAlerts } from './api';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatDate, formatMoney } from '@/lib/utils';

function StatCard({ label, value, accent, sub }: { label: string; value: string | number; accent?: boolean; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-ink-muted">{label}</div>
      <div className={`font-mono text-3xl font-semibold mt-1 ${accent ? 'text-ember' : ''}`}>{value}</div>
      {sub && <div className="text-xs text-ink-muted mt-1">{sub}</div>}
    </div>
  );
}

export function DashboardPage() {
  const { profile } = useAuth();
  const stats = useAssetStats();
  const alerts = useWarrantyAlerts();
  const open = useOpenAssignments();
  const activity = useRecentActivity();
  const due = useDueMaintenance();

  if (stats.isLoading) return <PageSkeleton />;
  if (stats.isError)
    return <ErrorState message={(stats.error as Error).message} onRetry={() => void stats.refetch()} />;

  const s = stats.data!;
  const writer = profile && can.assetWrite(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-ink-muted">Fleet health at a glance</p>
        </div>
        {writer && (
          <Link to="/assets" className="btn-primary">
            <Plus size={16} /> Register asset
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="Total assets" value={s.total} sub={`${formatMoney(s.active_value)} in service`} />
        <StatCard label="Active" value={s.active} />
        <StatCard label="Faulty" value={s.faulty} accent={s.faulty > 0} />
        <StatCard label="In repair" value={s.in_repair} />
        <StatCard label="Due maintenance" value={due.data ?? '—'} accent={(due.data ?? 0) > 0} sub="no service in 180 days" />
        <StatCard label="In custody" value={open.data?.length ?? '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* warranty alerts */}
        <section className="card p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <ShieldAlert size={17} className="text-ember" /> Warranty alerts
          </h2>
          {(alerts.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">No warranties expiring in the next 60 days.</p>
          ) : (
            <ul className="space-y-3">
              {(alerts.data ?? []).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 text-sm border-b border-hairline/50 pb-2 last:border-0">
                  <div>
                    <Link to={`/assets/${a.id}`} className="font-medium hover:underline">
                      {a.name}
                    </Link>
                    <div className="font-mono text-[11px] text-ink-muted">{a.asset_tag}</div>
                  </div>
                  <span
                    className={`badge ${a.days_left <= 30 ? 'bg-status-faulty/10 text-status-faulty' : 'bg-status-repair/10 text-status-repair'}`}
                  >
                    {a.days_left}d left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* recent activity */}
        <section className="card p-6">
          <h2 className="text-base font-semibold mb-4">Recent activity</h2>
          {(activity.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">No recorded changes yet.</p>
          ) : (
            <ul className="space-y-3">
              {(activity.data ?? []).map((e) => (
                <li key={e.id} className="text-sm flex justify-between gap-3 border-b border-hairline/50 pb-2 last:border-0">
                  <span>
                    <span className="font-medium">{e.action.toLowerCase()}</span>{' '}
                    <span className="text-ink-muted">on {e.table_name}</span>
                  </span>
                  <span className="text-xs text-ink-muted whitespace-nowrap">{formatDate(e.changed_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
