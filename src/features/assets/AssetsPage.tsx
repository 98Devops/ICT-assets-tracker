import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, FileUp, Plus, Search } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { can } from '@/features/auth/roles';
import { useDepartments } from '@/features/admin/lookups';
import { useAssets, type AssetSortKey } from './api';
import { AssetForm } from './AssetForm';
import { ImportWizard } from '@/features/import/ImportWizard';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { ASSET_CATEGORIES, ASSET_STATUSES, CATEGORY_LABELS, STATUS_LABELS } from '@/lib/types';
import type { AssetCategory, AssetStatus } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

const PAGE_SIZE = 20;

export function AssetsPage() {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AssetCategory | ''>('');
  const [status, setStatus] = useState<AssetStatus | ''>('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [sortBy, setSortBy] = useState<AssetSortKey>('asset_tag');
  const [sortAsc, setSortAsc] = useState(true);

  const departments = useDepartments();
  const q = useAssets({ search, category, status, department_id: departmentId, page, pageSize: PAGE_SIZE, sortBy, sortAsc });

  const toggleSort = (key: AssetSortKey) => {
    if (sortBy === key) setSortAsc((a) => !a);
    else {
      setSortBy(key);
      setSortAsc(true);
    }
    setPage(0);
  };
  const sortIndicator = (key: AssetSortKey) => (sortBy === key ? (sortAsc ? ' ↑' : ' ↓') : '');

  if (q.isLoading) return <PageSkeleton />;
  if (q.isError) return <ErrorState message={(q.error as Error).message} onRetry={() => void q.refetch()} />;

  const { rows, count } = q.data!;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const writer = profile && can.assetWrite(profile.role);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Assets</h1>
          <p className="text-sm text-ink-muted">
            {count} asset{count === 1 ? '' : 's'} on the register
          </p>
        </div>
        {writer && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setShowImport(true)}>
              <FileUp size={16} /> Import CSV
            </button>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Register asset
            </button>
          </div>
        )}
      </div>

      {/* filters */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            aria-label="Search assets"
            className="input pl-9"
            placeholder="Search name, serial, tag…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <select aria-label="Filter by category" className="input" value={category} onChange={(e) => { setCategory(e.target.value as AssetCategory | ''); setPage(0); }}>
          <option value="">All categories</option>
          {ASSET_CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select aria-label="Filter by status" className="input" value={status} onChange={(e) => { setStatus(e.target.value as AssetStatus | ''); setPage(0); }}>
          <option value="">All statuses</option>
          {ASSET_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select aria-label="Filter by department" className="input" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(0); }}>
          <option value="">All departments</option>
          {(departments.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No assets match"
          hint={search || category || status ? 'Try clearing the filters.' : 'Register your first asset to start the register.'}
          action={
            writer ? (
              <button className="btn-primary" onClick={() => setShowForm(true)}>
                <Plus size={16} /> Register asset
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-panel text-left">
              <tr className="border-b border-hairline">
                <th className="px-4 py-3 font-medium">
                  <button className="hover:text-ember" onClick={() => toggleSort('asset_tag')}>Tag{sortIndicator('asset_tag')}</button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button className="hover:text-ember" onClick={() => toggleSort('name')}>Name{sortIndicator('name')}</button>
                </th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Category</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Department</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Location</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">
                  <button className="hover:text-ember" onClick={() => toggleSort('cost')}>Cost{sortIndicator('cost')}</button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button className="hover:text-ember" onClick={() => toggleSort('status')}>Status{sortIndicator('status')}</button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-hairline/60 last:border-0 hover:bg-surface-panel/50 transition">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link className="text-ember hover:underline" to={`/assets/${a.id}`}>
                      {a.asset_tag}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/assets/${a.id}`} className="hover:underline font-medium">
                      {a.name}
                    </Link>
                    {a.serial_number && (
                      <div className="font-mono text-[11px] text-ink-muted">{a.serial_number}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">{CATEGORY_LABELS[a.category]}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{a.departments?.name ?? '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{a.location ?? '—'}</td>
                  <td className="px-4 py-3 hidden sm:table-cell font-mono text-xs">{formatMoney(a.cost)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button className="btn-secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="text-ink-muted">
            Page {page + 1} of {pages}
          </span>
          <button className="btn-secondary" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}

      <Modal title="Register asset" open={showForm} onClose={() => setShowForm(false)} wide>
        <AssetForm onDone={() => setShowForm(false)} />
      </Modal>
      <Modal title="Import assets from CSV" open={showImport} onClose={() => setShowImport(false)} wide>
        <ImportWizard onDone={() => setShowImport(false)} />
      </Modal>
    </div>
  );
}
