import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthContext';
import {
  MAINTENANCE_LABELS,
  MAINTENANCE_TYPES,
  maintenanceSchema,
  useLogMaintenance,
  type MaintenanceValues,
} from './api';

export function MaintenanceForm({ assetId, onDone }: { assetId: string; onDone: () => void }) {
  const { profile } = useAuth();
  const log = useLogMaintenance(profile!.organization_id, profile!.id);
  const [values, setValues] = useState<MaintenanceValues>({
    asset_id: assetId,
    date: new Date().toISOString().slice(0, 10),
    type: 'repair',
    description: '',
    parts_replaced: '',
    cost: null,
    performed_by: '',
  });
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof MaintenanceValues>(k: K, v: MaintenanceValues[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = maintenanceSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form.');
      return;
    }
    try {
      await log.mutateAsync(parsed.data);
      toast.success('Maintenance logged');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="m_date" className="block text-sm font-medium mb-1">
            Date
          </label>
          <input id="m_date" type="date" className="input" value={values.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div>
          <label htmlFor="m_type" className="block text-sm font-medium mb-1">
            Type
          </label>
          <select id="m_type" className="input" value={values.type} onChange={(e) => set('type', e.target.value as MaintenanceValues['type'])}>
            {MAINTENANCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {MAINTENANCE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="m_desc" className="block text-sm font-medium mb-1">
          Description
        </label>
        <textarea id="m_desc" rows={3} className="input" value={values.description} onChange={(e) => set('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="m_parts" className="block text-sm font-medium mb-1">
            Parts replaced
          </label>
          <input id="m_parts" className="input" value={values.parts_replaced ?? ''} onChange={(e) => set('parts_replaced', e.target.value)} />
        </div>
        <div>
          <label htmlFor="m_cost" className="block text-sm font-medium mb-1">
            Cost (USD)
          </label>
          <input
            id="m_cost"
            type="number"
            min="0"
            step="0.01"
            className="input font-mono"
            value={values.cost ?? ''}
            onChange={(e) => set('cost', e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
      </div>
      <div>
        <label htmlFor="m_by" className="block text-sm font-medium mb-1">
          Performed by
        </label>
        <input id="m_by" className="input" placeholder="Technician or vendor name" value={values.performed_by ?? ''} onChange={(e) => set('performed_by', e.target.value)} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-status-faulty">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={log.isPending}>
          {log.isPending ? 'Saving…' : 'Log maintenance'}
        </button>
      </div>
    </form>
  );
}
