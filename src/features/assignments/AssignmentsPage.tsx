import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { can } from '@/features/auth/roles';
import { useOpenAssignments } from './api';
import { ReturnForm } from './ReturnForm';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { formatDate } from '@/lib/utils';

export function AssignmentsPage() {
  const { profile } = useAuth();
  const q = useOpenAssignments();
  const [returning, setReturning] = useState<string | null>(null);

  if (q.isLoading) return <PageSkeleton />;
  if (q.isError) return <ErrorState message={(q.error as Error).message} onRetry={() => void q.refetch()} />;

  const rows = q.data!;
  const assigner = profile && can.assign(profile.role);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Assignments</h1>
        <p className="text-sm text-ink-muted">{rows.length} asset{rows.length === 1 ? '' : 's'} currently in custody</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Nothing is checked out"
          hint="Assign an asset from its detail page to start tracking custody."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-panel text-left">
              <tr className="border-b border-hairline">
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Held by</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Since</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Expected return</th>
                {assigner && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const overdue = r.expected_return_date && r.expected_return_date < today;
                return (
                  <tr key={r.id} className="border-b border-hairline/60 last:border-0 hover:bg-surface-panel/50 transition">
                    <td className="px-4 py-3">
                      <Link to={`/assets/${r.asset_id}`} className="font-medium hover:underline">
                        {r.asset_name}
                      </Link>
                      <div className="font-mono text-[11px] text-ink-muted">{r.asset_tag}</div>
                    </td>
                    <td className="px-4 py-3">{r.assigned_to_name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">{formatDate(r.assigned_date)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {formatDate(r.expected_return_date)}
                      {overdue && <span className="ml-2 badge bg-status-faulty/10 text-status-faulty">overdue</span>}
                    </td>
                    {assigner && (
                      <td className="px-4 py-3 text-right">
                        <button className="btn-secondary" onClick={() => setReturning(r.id)}>
                          Record return
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Record return" open={!!returning} onClose={() => setReturning(null)}>
        {returning && <ReturnForm assignmentId={returning} onDone={() => setReturning(null)} />}
      </Modal>
    </div>
  );
}
