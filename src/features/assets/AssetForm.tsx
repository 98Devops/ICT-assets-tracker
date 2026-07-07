import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/features/auth/AuthContext';
import { useDepartments, useSuppliers } from '@/features/admin/lookups';
import {
  assetSchema,
  suggestNextTag,
  useCreateAsset,
  useUpdateAsset,
  type AssetFormValues,
} from './api';
import type { Asset } from '@/lib/types';
import { ASSET_CATEGORIES, ASSET_STATUSES, CATEGORY_LABELS, STATUS_LABELS } from '@/lib/types';

type Errors = Partial<Record<keyof AssetFormValues, string>>;

const empty: AssetFormValues = {
  asset_tag: '',
  name: '',
  category: 'laptop',
  serial_number: '',
  model: '',
  supplier_id: null,
  purchase_date: '',
  cost: null,
  warranty_expiry: '',
  status: 'active',
  condition: '',
  location: '',
  department_id: null,
  notes: '',
};

export function AssetForm({ asset, onDone }: { asset?: Asset; onDone: () => void }) {
  const { profile } = useAuth();
  const [values, setValues] = useState<AssetFormValues>(
    asset
      ? {
          ...empty,
          ...Object.fromEntries(Object.entries(asset).filter(([k]) => k in empty)),
          serial_number: asset.serial_number ?? '',
          model: asset.model ?? '',
          purchase_date: asset.purchase_date ?? '',
          warranty_expiry: asset.warranty_expiry ?? '',
          condition: asset.condition ?? '',
          location: asset.location ?? '',
          notes: asset.notes ?? '',
        }
      : empty,
  );
  const [errors, setErrors] = useState<Errors>({});
  const departments = useDepartments();
  const suppliers = useSuppliers();
  const create = useCreateAsset(profile!.organization_id);
  const update = useUpdateAsset(profile!.organization_id);
  const busy = create.isPending || update.isPending;

  useEffect(() => {
    if (!asset) void suggestNextTag().then((tag) => setValues((v) => (v.asset_tag ? v : { ...v, asset_tag: tag })));
  }, [asset]);

  const set = <K extends keyof AssetFormValues>(k: K, v: AssetFormValues[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = assetSchema.safeParse(values);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const issue of (parsed.error as z.ZodError).issues) {
        errs[issue.path[0] as keyof AssetFormValues] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      if (asset) {
        await update.mutateAsync({ id: asset.id, values: parsed.data });
        toast.success('Asset updated');
      } else {
        await create.mutateAsync(parsed.data);
        toast.success('Asset registered');
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const field = (label: string, key: keyof AssetFormValues, input: React.ReactNode) => (
    <div>
      <label htmlFor={String(key)} className="block text-sm font-medium mb-1">
        {label}
      </label>
      {input}
      {errors[key] && <p className="text-xs text-status-faulty mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {field(
        'Asset tag',
        'asset_tag',
        <input id="asset_tag" className="input font-mono" value={values.asset_tag} onChange={(e) => set('asset_tag', e.target.value)} />,
      )}
      {field(
        'Name',
        'name',
        <input id="name" className="input" value={values.name} onChange={(e) => set('name', e.target.value)} />,
      )}
      {field(
        'Category',
        'category',
        <select id="category" className="input" value={values.category} onChange={(e) => set('category', e.target.value as AssetFormValues['category'])}>
          {ASSET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>,
      )}
      {field(
        'Status',
        'status',
        <select id="status" className="input" value={values.status} onChange={(e) => set('status', e.target.value as AssetFormValues['status'])}>
          {ASSET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>,
      )}
      {field(
        'Serial number',
        'serial_number',
        <input id="serial_number" className="input font-mono" value={values.serial_number ?? ''} onChange={(e) => set('serial_number', e.target.value)} />,
      )}
      {field(
        'Model',
        'model',
        <input id="model" className="input" value={values.model ?? ''} onChange={(e) => set('model', e.target.value)} />,
      )}
      {field(
        'Supplier',
        'supplier_id',
        <select id="supplier_id" className="input" value={values.supplier_id ?? ''} onChange={(e) => set('supplier_id', e.target.value || null)}>
          <option value="">—</option>
          {(suppliers.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>,
      )}
      {field(
        'Department',
        'department_id',
        <select id="department_id" className="input" value={values.department_id ?? ''} onChange={(e) => set('department_id', e.target.value || null)}>
          <option value="">—</option>
          {(departments.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>,
      )}
      {field(
        'Purchase date',
        'purchase_date',
        <input id="purchase_date" type="date" className="input" value={values.purchase_date ?? ''} onChange={(e) => set('purchase_date', e.target.value)} />,
      )}
      {field(
        'Cost (USD)',
        'cost',
        <input
          id="cost"
          type="number"
          min="0"
          step="0.01"
          className="input font-mono"
          value={values.cost ?? ''}
          onChange={(e) => set('cost', e.target.value === '' ? null : Number(e.target.value))}
        />,
      )}
      {field(
        'Warranty expiry',
        'warranty_expiry',
        <input id="warranty_expiry" type="date" className="input" value={values.warranty_expiry ?? ''} onChange={(e) => set('warranty_expiry', e.target.value)} />,
      )}
      {field(
        'Location',
        'location',
        <input id="location" className="input" value={values.location ?? ''} onChange={(e) => set('location', e.target.value)} />,
      )}
      {field(
        'Condition',
        'condition',
        <input id="condition" className="input" value={values.condition ?? ''} onChange={(e) => set('condition', e.target.value)} />,
      )}
      <div className="sm:col-span-2">
        {field(
          'Notes',
          'notes',
          <textarea id="notes" rows={3} className="input" value={values.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />,
        )}
      </div>
      <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : asset ? 'Save changes' : 'Register asset'}
        </button>
      </div>
    </form>
  );
}
