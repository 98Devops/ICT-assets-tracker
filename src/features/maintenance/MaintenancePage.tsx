import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { MAINTENANCE_LABELS, useRecentMaintenance, useRepeatRepairs } from './api';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { formatDate, formatMoney } from '@/lib/utils';

export function MaintenancePage() {
  const q = useRecentMaintenance();
  const repeats = useRepeatRepairs();

  if (q.isLoading) return <PageSkeleton />;
  if (q.isError) return <ErrorState message={(q.error as Error).message} onRetry={() => void q.refetch()} />;

  const rows = q.data!;
  const flagged = new Set((repeats.data ?? []).map((r) => r.asset_id));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Maintenance</h1>
        <p className="text-sm text-ink-muted">Latest work across the fleet — log entries from an asset&apos;s page</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Wrench} title="No maintenance recorded yet" hint="Log repairs, services and inspections from any asset's detail page." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-panel text-left">
              <tr className="border-b border-hairline">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Description</th>
                <th className="px-4 py-3 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-hairline/60 last:border-0 hover:bg-surface-panel/50 transition">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(m.date)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/assets/${m.asset_id}`} className="hover:underline font-medium">
                      {m.assets?.name}
                    </Link>
                    <div className="font-mono text-[11px] text-ink-muted">{m.assets?.asset_tag}</div>
                    {flagged.has(m.asset_id) && (
                      <span className="badge bg-status-repair/10 text-status-repair mt-1">repeat repairs</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{MAINTENANCE_LABELS[m.type]}</td>
                  <td className="px-4 py-3 hidden md:table-cell max-w-md truncate">{m.description}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatMoney(m.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
