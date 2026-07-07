import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import type { Asset, AssetCategory, AssetStatus } from '@/lib/types';
import { ASSET_CATEGORIES, ASSET_STATUSES } from '@/lib/types';

export const assetSchema = z.object({
  asset_tag: z.string().min(3, 'Asset tag is required (e.g. ICT-0001)'),
  name: z.string().min(2, 'Name is required'),
  category: z.enum(ASSET_CATEGORIES as [AssetCategory, ...AssetCategory[]]),
  serial_number: z.string().optional().or(z.literal('')),
  model: z.string().optional().or(z.literal('')),
  supplier_id: z.string().uuid().nullable().optional(),
  purchase_date: z.string().optional().or(z.literal('')),
  cost: z.coerce.number().min(0).optional().nullable(),
  warranty_expiry: z.string().optional().or(z.literal('')),
  status: z.enum(ASSET_STATUSES as [AssetStatus, ...AssetStatus[]]),
  condition: z.string().optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  department_id: z.string().uuid().nullable().optional(),
  notes: z.string().optional().or(z.literal('')),
});
export type AssetFormValues = z.infer<typeof assetSchema>;

export type AssetSortKey = 'asset_tag' | 'name' | 'cost' | 'purchase_date' | 'status';

export interface AssetFilters {
  search?: string;
  category?: AssetCategory | '';
  status?: AssetStatus | '';
  department_id?: string;
  page?: number;
  pageSize?: number;
  sortBy?: AssetSortKey;
  sortAsc?: boolean;
}

export function useAssets(filters: AssetFilters) {
  const {
    search = '', category = '', status = '', department_id = '',
    page = 0, pageSize = 20, sortBy = 'asset_tag', sortAsc = true,
  } = filters;
  return useQuery({
    queryKey: ['assets', search, category, status, department_id, page, pageSize, sortBy, sortAsc],
    queryFn: async () => {
      let q = supabase
        .from('assets')
        .select('*, departments(name), suppliers(name)', { count: 'exact' })
        .order(sortBy, { ascending: sortAsc, nullsFirst: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (search) q = q.or(`name.ilike.%${search}%,serial_number.ilike.%${search}%,asset_tag.ilike.%${search}%`);
      if (category) q = q.eq('category', category);
      if (status) q = q.eq('status', status);
      if (department_id) q = q.eq('department_id', department_id);
      const { data, error, count } = await q;
      if (error) throw new Error('Could not load assets. Please try again.');
      return { rows: (data ?? []) as (Asset & { departments: { name: string } | null; suppliers: { name: string } | null })[], count: count ?? 0 };
    },
  });
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: ['asset', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*, departments(name), suppliers(name)')
        .eq('id', id!)
        .single();
      if (error) throw new Error('Asset not found or you do not have access.');
      return data as Asset & { departments: { name: string } | null; suppliers: { name: string } | null };
    },
  });
}

function cleanValues(values: AssetFormValues, organizationId: string) {
  return {
    ...values,
    organization_id: organizationId,
    serial_number: values.serial_number || null,
    model: values.model || null,
    purchase_date: values.purchase_date || null,
    warranty_expiry: values.warranty_expiry || null,
    cost: values.cost ?? null,
    condition: values.condition || null,
    location: values.location || null,
    notes: values.notes || null,
    supplier_id: values.supplier_id || null,
    department_id: values.department_id || null,
  };
}

export function useCreateAsset(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: AssetFormValues) => {
      const { data, error } = await supabase
        .from('assets')
        .insert(cleanValues(values, organizationId))
        .select()
        .single();
      if (error) {
        if (error.code === '23505') throw new Error('That asset tag is already in use.');
        throw new Error('Could not save the asset. Please try again.');
      }
      return data as Asset;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

export function useUpdateAsset(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: AssetFormValues }) => {
      const { data, error } = await supabase
        .from('assets')
        .update(cleanValues(values, organizationId))
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(friendlyDbError(error.message));
      return data as Asset;
    },
    onSuccess: (_d, { id }) => {
      void qc.invalidateQueries({ queryKey: ['assets'] });
      void qc.invalidateQueries({ queryKey: ['asset', id] });
    },
  });
}

export function friendlyDbError(message: string): string {
  if (/open assignment/i.test(message))
    return 'This asset has an open assignment — record the return first.';
  if (/duplicate key/i.test(message)) return 'That asset tag is already in use.';
  return 'Could not save the change. Please try again.';
}

/** Next sequential tag suggestion, e.g. ICT-0021. */
export async function suggestNextTag(): Promise<string> {
  const { data } = await supabase
    .from('assets')
    .select('asset_tag')
    .order('asset_tag', { ascending: false })
    .limit(1);
  const last = data?.[0]?.asset_tag as string | undefined;
  const n = last?.match(/(\d+)$/)?.[1];
  const next = n ? Number(n) + 1 : 1;
  return `ICT-${String(next).padStart(4, '0')}`;
}
