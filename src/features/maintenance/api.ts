import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import type { MaintenanceLog, MaintenanceType } from '@/lib/types';

export const MAINTENANCE_TYPES: MaintenanceType[] = [
  'repair',
  'service',
  'inspection',
  'part_replacement',
];
export const MAINTENANCE_LABELS: Record<MaintenanceType, string> = {
  repair: 'Repair',
  service: 'Service',
  inspection: 'Inspection',
  part_replacement: 'Part Replacement',
};

export const maintenanceSchema = z.object({
  asset_id: z.string().uuid(),
  date: z.string().min(1, 'Date is required'),
  type: z.enum(MAINTENANCE_TYPES as [MaintenanceType, ...MaintenanceType[]]),
  description: z.string().min(5, 'Describe the work done'),
  parts_replaced: z.string().optional().or(z.literal('')),
  cost: z.coerce.number().min(0).optional().nullable(),
  performed_by: z.string().optional().or(z.literal('')),
});
export type MaintenanceValues = z.infer<typeof maintenanceSchema>;

export function useAssetMaintenance(assetId: string | undefined) {
  return useQuery({
    queryKey: ['maintenance', 'asset', assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select('*')
        .eq('asset_id', assetId!)
        .order('date', { ascending: false });
      if (error) throw new Error('Could not load maintenance history.');
      return (data ?? []) as MaintenanceLog[];
    },
  });
}

export function useRecentMaintenance(limit = 30) {
  return useQuery({
    queryKey: ['maintenance', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select('*, assets(name, asset_tag)')
        .order('date', { ascending: false })
        .limit(limit);
      if (error) throw new Error('Could not load maintenance logs.');
      return (data ?? []) as (MaintenanceLog & { assets: { name: string; asset_tag: string } })[];
    },
  });
}

export function useRepeatRepairs() {
  return useQuery({
    queryKey: ['maintenance', 'repeat'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_repeat_repairs').select('*');
      if (error) throw new Error('Could not load repeat-repair flags.');
      return (data ?? []) as { asset_id: string; repair_count: number }[];
    },
  });
}

export function useLogMaintenance(organizationId: string, createdBy: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: MaintenanceValues) => {
      const { error } = await supabase.from('maintenance_logs').insert({
        organization_id: organizationId,
        asset_id: values.asset_id,
        date: values.date,
        type: values.type,
        description: values.description,
        parts_replaced: values.parts_replaced || null,
        cost: values.cost ?? null,
        performed_by: values.performed_by || null,
        created_by: createdBy,
      });
      if (error) throw new Error('Could not save the maintenance log. Please try again.');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance'] }),
  });
}
