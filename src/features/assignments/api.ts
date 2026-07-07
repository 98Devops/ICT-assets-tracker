import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import type { Assignment } from '@/lib/types';

export const assignSchema = z.object({
  asset_id: z.string().uuid(),
  assigned_to: z.string().uuid({ message: 'Choose a person' }),
  assigned_date: z.string().min(1, 'Date is required'),
  expected_return_date: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});
export type AssignValues = z.infer<typeof assignSchema>;

export const returnSchema = z.object({
  returned_date: z.string().min(1, 'Return date is required'),
  return_condition: z.string().min(2, 'Describe the condition at return'),
});
export type ReturnValues = z.infer<typeof returnSchema>;

export type AssignmentRow = Assignment & {
  assigned_to_profile: { full_name: string } | null;
  assigned_by_profile: { full_name: string } | null;
};

const SELECT =
  '*, assigned_to_profile:profiles!assignments_assigned_to_fkey(full_name), assigned_by_profile:profiles!assignments_assigned_by_fkey(full_name)';

export function useAssetAssignments(assetId: string | undefined) {
  return useQuery({
    queryKey: ['assignments', 'asset', assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select(SELECT)
        .eq('asset_id', assetId!)
        .order('assigned_date', { ascending: false });
      if (error) throw new Error('Could not load assignment history.');
      return (data ?? []) as AssignmentRow[];
    },
  });
}

export function useOpenAssignments() {
  return useQuery({
    queryKey: ['assignments', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_open_assignments')
        .select('*')
        .order('assigned_date', { ascending: false });
      if (error) throw new Error('Could not load open assignments.');
      return (data ?? []) as (Assignment & {
        asset_name: string;
        asset_tag: string;
        assigned_to_name: string;
      })[];
    },
  });
}

export function useAssign(organizationId: string, assignedBy: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: AssignValues) => {
      const { error } = await supabase.from('assignments').insert({
        organization_id: organizationId,
        asset_id: values.asset_id,
        assigned_to: values.assigned_to,
        assigned_by: assignedBy,
        assigned_date: values.assigned_date,
        expected_return_date: values.expected_return_date || null,
        notes: values.notes || null,
      });
      if (error) {
        if (error.code === '23505')
          throw new Error('This asset is already assigned — record the return first.');
        if (/cannot assign/i.test(error.message))
          throw new Error('This asset is retired or lost and cannot be assigned.');
        throw new Error('Could not record the assignment. Please try again.');
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

export function useReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ReturnValues }) => {
      const { error } = await supabase
        .from('assignments')
        .update({ returned_date: values.returned_date, return_condition: values.return_condition })
        .eq('id', id);
      if (error) throw new Error('Could not record the return. Please try again.');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
}
