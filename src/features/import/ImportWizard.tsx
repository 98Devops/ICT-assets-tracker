import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, FileUp, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthContext';
import { suggestNextTag } from '@/features/assets/api';
import {
  autoMapHeader,
  IMPORT_FIELDS,
  parseCsv,
  validateRows,
  type ImportField,
  type ParsedCsv,
  type RowResult,
} from './importer';
import { buildCsv } from '@/lib/utils';

type Step = 'pick' | 'map' | 'preview' | 'done';

export function ImportWizard({ onDone }: { onDone: () => void }) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>('pick');
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Record<string, ImportField | ''>>({});
  const [results, setResults] = useState<RowResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState(0);
  const [failed, setFailed] = useState<RowResult[]>([]);

  const onFile = async (file: File) => {
    try {
      const parsed = await parseCsv(file);
      setCsv(parsed);
      const auto: Record<string, ImportField | ''> = {};
      for (const h of parsed.headers) auto[h] = autoMapHeader(h) ?? '';
      setMapping(auto);
      setStep('map');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not read the file.');
    }
  };

  const toPreview = async () => {
    if (!csv) return;
    if (!Object.values(mapping).includes('name')) {
      toast.error('Map at least a "Name" column.');
      return;
    }
    const nextTag = await suggestNextTag();
    const start = Number(nextTag.match(/(\d+)$/)?.[1] ?? 1);
    setResults(validateRows(csv.rows, mapping, start).results);
    setStep('preview');
  };

  const runImport = async () => {
    setBusy(true);
    const ok: RowResult[] = results.filter((r) => r.values);
    const errors: RowResult[] = results.filter((r) => !r.values);
    let success = 0;
    // insert in chunks of 50; collect per-row failures (e.g. tag already on register)
    for (let i = 0; i < ok.length; i += 50) {
      const chunk = ok.slice(i, i + 50);
      const { error } = await supabase.from('assets').insert(
        chunk.map((r) => ({
          ...r.values!,
          organization_id: profile!.organization_id,
          created_by: profile!.id,
          serial_number: r.values!.serial_number || null,
          model: r.values!.model || null,
          purchase_date: r.values!.purchase_date || null,
          warranty_expiry: r.values!.warranty_expiry || null,
          cost: r.values!.cost ?? null,
          condition: r.values!.condition || null,
          location: r.values!.location || null,
          notes: r.values!.notes || null,
          supplier_id: null,
          department_id: null,
        })),
      );
      if (error) {
        // fall back to row-by-row so one duplicate doesn't sink the chunk
        for (const r of chunk) {
          const { error: rowErr } = await supabase.from('assets').insert({
            ...r.values!,
            organization_id: profile!.organization_id,
            created_by: profile!.id,
            serial_number: r.values!.serial_number || null,
            model: r.values!.model || null,
            purchase_date: r.values!.purchase_date || null,
            warranty_expiry: r.values!.warranty_expiry || null,
            cost: r.values!.cost ?? null,
            condition: r.values!.condition || null,
            location: r.values!.location || null,
            notes: r.values!.notes || null,
            supplier_id: null,
            department_id: null,
          });
          if (rowErr) {
            errors.push({
              ...r,
              values: null,
              errors: [rowErr.code === '23505' ? `asset_tag: "${r.values!.asset_tag}" already on the register` : 'database rejected the row'],
            });
          } else success++;
        }
      } else success += chunk.length;
    }
    setImported(success);
    setFailed(errors);
    setBusy(false);
    setStep('done');
    void qc.invalidateQueries({ queryKey: ['assets'] });
    if (success > 0) toast.success(`${success} assets imported`);
  };

  const downloadErrors = () =>
    downloadErrorsCsv(failed);

  if (step === 'pick') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Upload your existing register as a <strong>CSV</strong> file. Using Excel? File → Save As →
          CSV. The first row must be column headings.
        </p>
        <label className="card border-dashed border-2 p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-ember transition">
          <FileUp size={28} className="text-ink-muted" />
          <span className="text-sm font-medium">Choose a CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])}
          />
        </label>
      </div>
    );
  }

  if (step === 'map' && csv) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Match your columns to asset fields. Unmapped columns are ignored. Missing tags will be
          auto-generated; unknown categories become “Other”.
        </p>
        <div className="max-h-80 overflow-y-auto space-y-2">
          {csv.headers.map((h) => (
            <div key={h} className="grid grid-cols-2 gap-3 items-center">
              <div className="text-sm font-medium truncate" title={h}>
                {h}
                <div className="text-[11px] text-ink-muted font-normal truncate">
                  e.g. {csv.rows[0]?.[h] || '—'}
                </div>
              </div>
              <select
                aria-label={`Map column ${h}`}
                className="input"
                value={mapping[h] ?? ''}
                onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value as ImportField | '' }))}
              >
                <option value="">— ignore —</option>
                {IMPORT_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {f.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          <button className="btn-secondary" onClick={() => setStep('pick')}>
            Back
          </button>
          <button className="btn-primary" onClick={() => void toPreview()}>
            Preview {csv.rows.length} rows
          </button>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    const valid = results.filter((r) => r.values).length;
    const invalid = results.length - valid;
    return (
      <div className="space-y-4">
        <div className="flex gap-4 text-sm">
          <span className="badge bg-status-active/10 text-status-active">{valid} ready</span>
          {invalid > 0 && <span className="badge bg-status-faulty/10 text-status-faulty">{invalid} with problems (skipped)</span>}
        </div>
        <div className="max-h-72 overflow-y-auto card">
          <table className="w-full text-xs">
            <thead className="bg-surface-panel text-left sticky top-0">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Tag</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Problems</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.index} className={r.errors.length ? 'bg-status-faulty/5' : ''}>
                  <td className="px-3 py-1.5 text-ink-muted">{r.index + 2}</td>
                  <td className="px-3 py-1.5 font-mono">{r.values?.asset_tag ?? '—'}</td>
                  <td className="px-3 py-1.5">{r.values?.name ?? r.raw[Object.keys(r.raw)[0]] ?? ''}</td>
                  <td className="px-3 py-1.5">{r.values?.category ?? ''}</td>
                  <td className="px-3 py-1.5 text-status-faulty">{r.errors.join('; ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between">
          <button className="btn-secondary" onClick={() => setStep('map')}>
            Back
          </button>
          <button className="btn-primary" disabled={valid === 0 || busy} onClick={() => void runImport()}>
            <Upload size={15} /> {busy ? 'Importing…' : `Import ${valid} assets`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center py-4">
      <div className="text-4xl font-mono font-semibold text-ember">{imported}</div>
      <p className="text-sm">assets imported to the register.</p>
      {failed.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-status-faulty">{failed.length} rows were skipped.</p>
          <button className="btn-secondary" onClick={downloadErrors}>
            <Download size={15} /> Download problem rows (CSV)
          </button>
        </div>
      )}
      <button className="btn-primary w-full" onClick={onDone}>
        Done
      </button>
    </div>
  );
}

function downloadErrorsCsv(failed: RowResult[]) {
  const rows = failed.map((r) => ({ row: r.index + 2, problems: r.errors.join('; '), ...r.raw }));
  const csvText = buildCsv(rows);
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'import-problems.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}
