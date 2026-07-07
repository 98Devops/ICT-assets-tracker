import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthContext';
import { useDepartments, usePeople, useSuppliers } from './lookups';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { ROLE_LABELS, type AppRole } from '@/lib/types';

const ROLES = Object.keys(ROLE_LABELS) as AppRole[];

export function AdminPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const people = usePeople();
  const departments = useDepartments();
  const suppliers = useSuppliers();
  const [newDept, setNewDept] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
      if (error) throw new Error('Could not update the role.');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['people'] });
      toast.success('Role updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('profiles').update({ active }).eq('id', id);
      if (error) throw new Error('Could not update the user.');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['people'] });
      toast.success('User updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addDept = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('departments')
        .insert({ organization_id: profile!.organization_id, name });
      if (error) throw new Error('Could not add the department (duplicate name?).');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['departments'] });
      setNewDept('');
      toast.success('Department added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addSupplier = useMutation({
    mutationFn: async ({ name, contact }: { name: string; contact: string }) => {
      const { error } = await supabase
        .from('suppliers')
        .insert({ organization_id: profile!.organization_id, name, contact: contact || null });
      if (error) throw new Error('Could not add the supplier.');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['suppliers'] });
      setNewSupplier('');
      setNewSupplierContact('');
      toast.success('Supplier added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (people.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-ink-muted">Users, departments and suppliers. New users are created in Supabase Auth (see HANDOFF.md).</p>
      </div>

      <section className="card overflow-x-auto">
        <h2 className="px-4 py-3 font-semibold text-sm border-b border-hairline">Users</h2>
        <table className="w-full text-sm">
          <thead className="bg-surface-panel text-left">
            <tr className="border-b border-hairline">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {(people.data ?? []).map((p) => (
              <tr key={p.id} className="border-b border-hairline/60 last:border-0">
                <td className="px-4 py-2 font-medium">
                  {p.full_name}
                  {p.id === profile!.id && <span className="ml-2 badge bg-ember-soft text-ember">you</span>}
                </td>
                <td className="px-4 py-2">
                  <select
                    aria-label={`Role for ${p.full_name}`}
                    className="input max-w-44"
                    value={p.role}
                    disabled={p.id === profile!.id || updateRole.isPending}
                    onChange={(e) => updateRole.mutate({ id: p.id, role: e.target.value as AppRole })}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <span className={`badge ${p.active ? 'bg-status-active/10 text-status-active' : 'bg-surface-panel text-ink-muted'}`}>
                    {p.active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {p.id !== profile!.id && (
                    <button
                      className="btn-secondary"
                      disabled={toggleActive.isPending}
                      onClick={() => toggleActive.mutate({ id: p.id, active: !p.active })}
                    >
                      {p.active ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card p-5">
          <h2 className="font-semibold text-sm mb-3">Departments</h2>
          <ul className="space-y-1 mb-4 text-sm">
            {(departments.data ?? []).map((d) => (
              <li key={d.id} className="border-b border-hairline/50 pb-1 last:border-0">
                {d.name}
              </li>
            ))}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newDept.trim()) addDept.mutate(newDept.trim());
            }}
          >
            <input aria-label="New department name" className="input" placeholder="New department" value={newDept} onChange={(e) => setNewDept(e.target.value)} />
            <button type="submit" className="btn-primary" disabled={addDept.isPending}>
              Add
            </button>
          </form>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-sm mb-3">Suppliers</h2>
          <ul className="space-y-1 mb-4 text-sm">
            {(suppliers.data ?? []).map((s) => (
              <li key={s.id} className="border-b border-hairline/50 pb-1 last:border-0">
                {s.name} {s.contact && <span className="text-xs text-ink-muted">· {s.contact}</span>}
              </li>
            ))}
          </ul>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newSupplier.trim())
                addSupplier.mutate({ name: newSupplier.trim(), contact: newSupplierContact.trim() });
            }}
          >
            <input aria-label="New supplier name" className="input" placeholder="Supplier name" value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} />
            <div className="flex gap-2">
              <input aria-label="Supplier contact" className="input" placeholder="Contact (optional)" value={newSupplierContact} onChange={(e) => setNewSupplierContact(e.target.value)} />
              <button type="submit" className="btn-primary" disabled={addSupplier.isPending}>
                Add
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
