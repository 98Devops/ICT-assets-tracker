import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Department, Profile, Supplier } from '@/lib/types';

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').order('name');
      if (error) throw new Error('Could not load departments.');
      return (data ?? []) as Department[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      if (error) throw new Error('Could not load suppliers.');
      return (data ?? []) as Supplier[];
    },
    staleTime: 5 * 60_000,
  });
}

export function usePeople() {
  return useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('active', true)
        .order('full_name');
      if (error) throw new Error('Could not load people.');
      return (data ?? []) as Profile[];
    },
    staleTime: 5 * 60_000,
  });
}
