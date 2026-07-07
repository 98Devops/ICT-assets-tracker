import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AssetQr } from '@/features/qr/QrCode';
import { ReportHeader } from './ReportHeader';
import { straightLine } from '@/lib/depreciation';
import { MAINTENANCE_LABELS } from '@/features/maintenance/api';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { CATEGORY_LABELS, STATUS_LABELS, type Asset, type MaintenanceLog } from '@/lib/types';
import { downloadCsv, formatDate, formatMoney } from '@/lib/utils';

type Tab = 'inventory' | 'valuation' | 'maintenance' | 'lost' | 'labels';
const TABS: { id: Tab; label: string }[] = [
  { id: 'inventory', label: 'Inventory' },
  { id: 'valuation', label: 'Valuation' },
  { id: 'maintenance', label: 'Maintenance cost' },
  { id: 'lost', label: 'Lost / missing' },
  { id: 'labels', label: 'QR labels' },
];

function useAllAssets() {
  return useQuery({
    queryKey: ['reports', 'assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*, departments(name), suppliers(name)')
        .order('asset_tag');
      if (error) throw new Error('Could not load report data.');
      return (data ?? []) as (Asset & { departments: { name: string } | null; suppliers: { name: string } | null })[];
    },
  });
}

function useAllMaintenance(from: string, to: string) {
  return useQuery({
    queryKey: ['reports', 'maintenance', from, to],
    queryFn: async () => {
      let q = supabase.from('maintenance_logs').select('*, assets(name, asset_tag)').order('date');
      if (from) q = q.gte('date', from);
      if (to) q = q.lte('date', to);
      const { data, error } = await q;
      if (error) throw new Error('Could not load maintenance data.');
      return (data ?? []) as (MaintenanceLog & { assets: { name: string; asset_tag: string } })[];
    },
  });
}

export function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'inventory';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const assets = useAllAssets();
  const maintenance = useAllMaintenance(from, to);

  const inRange = useMemo(
    () =>
      (assets.data ?? []).filter((a) => {
        if (!from && !to) return true;
        if (!a.purchase_date) return false;
        return (!from || a.purchase_date >= from) && (!to || a.purchase_date <= to);
      }),
    [assets.data, from, to],
  );

  if (assets.isLoading) return <PageSkeleton />;
  if (assets.isError)
    return <ErrorState message={(assets.error as Error).message} onRetry={() => void assets.refetch()} />;

  const setTab = (t: Tab) => setParams({ tab: t });

  const exportInventory = () =>
    downloadCsv(
      'iats-inventory.csv',
      inRange.map((a) => ({
        tag: a.asset_tag, name: a.name, category: CATEGORY_LABELS[a.category],
        serial: a.serial_number ?? '', model: a.model ?? '', status: STATUS_LABELS[a.status],
        department: a.departments?.name ?? '', location: a.location ?? '',
        purchase_date: a.purchase_date ?? '', cost: a.cost ?? '', warranty_expiry: a.warranty_expiry ?? '',
      })),
    );

  const valuationByCategory = Object.entries(
    inRange
      .filter((a) => !['retired', 'lost'].includes(a.status))
      .reduce<Record<string, { count: number; value: number; book: number }>>((acc, a) => {
        const k = CATEGORY_LABELS[a.category];
        acc[k] = acc[k] ?? { count: 0, value: 0, book: 0 };
        acc[k].count += 1;
        acc[k].value += a.cost ?? 0;
        const dep = straightLine(a.cost, a.purchase_date, a.useful_life_years ?? 4);
        acc[k].book += dep ? dep.bookValue : (a.cost ?? 0);
        return acc;
      }, {}),
  ).sort((x, y) => y[1].value - x[1].value);

  const lost = (assets.data ?? []).filter((a) => ['lost', 'retired'].includes(a.status));
  const maintTotal = (maintenance.data ?? []).reduce((s, m) => s + (m.cost ?? 0), 0);
  const labelAssets = (assets.data ?? []).filter((a) => !['retired', 'lost'].includes(a.status));

  return (
    <div className="space-y-5">
      <div className="no-print">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-ink-muted">Date-filtered reports with CSV export</p>
      </div>

      <div className="no-print flex flex-wrap gap-2 border-b border-hairline pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === t.id ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface-panel'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ReportHeader
        title={`${TABS.find((t) => t.id === tab)?.label ?? ''} report`}
        subtitle={from || to ? `Period: ${from || '…'} → ${to || '…'}` : undefined}
      />

      {tab !== 'labels' && (
        <div className="no-print card p-4 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="r_from" className="block text-xs font-medium mb-1 text-ink-muted">
              From
            </label>
            <input id="r_from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="r_to" className="block text-xs font-medium mb-1 text-ink-muted">
              To
            </label>
            <input id="r_to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <p className="text-xs text-ink-muted pb-2.5">
            {tab === 'maintenance' ? 'Filters by work date.' : 'Filters by purchase date.'}
          </p>
          <button className="btn-secondary ml-auto" onClick={() => window.print()}>
            <Printer size={15} /> Print report
          </button>
        </div>
      )}

      {tab === 'inventory' && (
        <section className="card overflow-x-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
            <h2 className="font-semibold text-sm">{inRange.length} assets</h2>
            <button className="btn-secondary no-print" onClick={exportInventory}>
              <Download size={15} /> Export CSV
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-panel text-left">
              <tr className="border-b border-hairline">
                <th className="px-4 py-2 font-medium">Tag</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium hidden md:table-cell">Department</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {inRange.map((a) => (
                <tr key={a.id} className="border-b border-hairline/60 last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{a.asset_tag}</td>
                  <td className="px-4 py-2">{a.name}</td>
                  <td className="px-4 py-2">{CATEGORY_LABELS[a.category]}</td>
                  <td className="px-4 py-2 hidden md:table-cell">{a.departments?.name ?? '—'}</td>
                  <td className="px-4 py-2">{STATUS_LABELS[a.status]}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{formatMoney(a.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'valuation' && (
        <section className="card overflow-x-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
            <h2 className="font-semibold text-sm">Fleet valuation (in-service assets)</h2>
            <button
              className="btn-secondary no-print"
              onClick={() =>
                downloadCsv(
                  'iats-valuation.csv',
                  valuationByCategory.map(([category, v]) => ({
                    category,
                    count: v.count,
                    purchase_value: v.value,
                    book_value: Math.round(v.book * 100) / 100,
                  })),
                )
              }
            >
              <Download size={15} /> Export CSV
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-panel text-left">
              <tr className="border-b border-hairline">
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium text-right">Assets</th>
                <th className="px-4 py-2 font-medium text-right">Purchase value</th>
                <th className="px-4 py-2 font-medium text-right">Book value (straight-line)</th>
              </tr>
            </thead>
            <tbody>
              {valuationByCategory.map(([cat, v]) => (
                <tr key={cat} className="border-b border-hairline/60 last:border-0">
                  <td className="px-4 py-2">{cat}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{v.count}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{formatMoney(v.value)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{formatMoney(v.book)}</td>
                </tr>
              ))}
              <tr className="bg-surface-panel font-semibold">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right font-mono text-xs">
                  {valuationByCategory.reduce((s, [, v]) => s + v.count, 0)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs">
                  {formatMoney(valuationByCategory.reduce((s, [, v]) => s + v.value, 0))}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs">
                  {formatMoney(valuationByCategory.reduce((s, [, v]) => s + v.book, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {tab === 'maintenance' && (
        <section className="card overflow-x-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
            <h2 className="font-semibold text-sm">
              {(maintenance.data ?? []).length} entries · total {formatMoney(maintTotal)}
            </h2>
            <button
              className="btn-secondary no-print"
              onClick={() =>
                downloadCsv(
                  'iats-maintenance-costs.csv',
                  (maintenance.data ?? []).map((m) => ({
                    date: m.date, asset: m.assets?.name ?? '', tag: m.assets?.asset_tag ?? '',
                    type: MAINTENANCE_LABELS[m.type], description: m.description, cost: m.cost ?? 0,
                  })),
                )
              }
            >
              <Download size={15} /> Export CSV
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-panel text-left">
              <tr className="border-b border-hairline">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Asset</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {(maintenance.data ?? []).map((m) => (
                <tr key={m.id} className="border-b border-hairline/60 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(m.date)}</td>
                  <td className="px-4 py-2">
                    {m.assets?.name} <span className="font-mono text-[11px] text-ink-muted">{m.assets?.asset_tag}</span>
                  </td>
                  <td className="px-4 py-2">{MAINTENANCE_LABELS[m.type]}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{formatMoney(m.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'lost' && (
        <section className="card overflow-x-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
            <h2 className="font-semibold text-sm">{lost.length} lost / retired assets</h2>
            <button
              className="btn-secondary no-print"
              onClick={() =>
                downloadCsv(
                  'iats-lost-missing.csv',
                  lost.map((a) => ({
                    tag: a.asset_tag, name: a.name, status: STATUS_LABELS[a.status],
                    department: a.departments?.name ?? '', last_location: a.location ?? '',
                    cost: a.cost ?? '', notes: a.notes ?? '',
                  })),
                )
              }
            >
              <Download size={15} /> Export CSV
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-panel text-left">
              <tr className="border-b border-hairline">
                <th className="px-4 py-2 font-medium">Tag</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium hidden md:table-cell">Notes</th>
                <th className="px-4 py-2 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {lost.map((a) => (
                <tr key={a.id} className="border-b border-hairline/60 last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{a.asset_tag}</td>
                  <td className="px-4 py-2">{a.name}</td>
                  <td className="px-4 py-2">{STATUS_LABELS[a.status]}</td>
                  <td className="px-4 py-2 hidden md:table-cell max-w-md truncate">{a.notes ?? '—'}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{formatMoney(a.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'labels' && (
        <section>
          <div className="no-print flex items-center justify-between mb-4">
            <p className="text-sm text-ink-muted">{labelAssets.length} printable labels — scanning opens the asset page (sign-in required).</p>
            <button className="btn-primary" onClick={() => window.print()}>
              <Printer size={15} /> Print label sheet
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-4">
            {labelAssets.map((a) => (
              <div key={a.id} className="card p-4 flex flex-col items-center gap-2 break-inside-avoid">
                <AssetQr assetId={a.id} size={96} />
                <div className="font-mono text-xs font-semibold">{a.asset_tag}</div>
                <div className="text-[11px] text-center text-ink-muted leading-tight">{a.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
