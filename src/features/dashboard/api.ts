import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Asset, AuditLogEntry } from '@/lib/types';

export interface AssetStats {
  total: number;
  active: number;
  faulty: number;
  in_repair: number;
  retired: number;
  lost: number;
  active_value: number;
}

export function useAssetStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_asset_stats').select('*').maybeSingle();
      if (error) throw new Error('Could not load dashboard stats.');
      return (data ?? {
        total: 0, active: 0, faulty: 0, in_repair: 0, retired: 0, lost: 0, active_value: 0,
      }) as AssetStats;
    },
  });
}

export function useWarrantyAlerts() {
  return useQuery({
    queryKey: ['dashboard', 'warranty'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_warranty_alerts')
        .select('*')
        .order('days_left');
      if (error) throw new Error('Could not load warranty alerts.');
      return (data ?? []) as (Asset & { days_left: number; alert_band: '30' | '60' })[];
    },
  });
}

export function useRecentActivity(limit = 12) {
  return useQuery({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(limit);
      // auditors/managers only per RLS — treat denial as empty, not an error
      if (error) return [] as AuditLogEntry[];
      return (data ?? []) as AuditLogEntry[];
    },
  });
}
