import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useDepartments } from './lookups';
import { ROLE_LABELS, type AppRole } from '@/lib/types';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  return 'Iats-' + Array.from(arr, (n) => chars[n % chars.length]).join('');
}

export function AddUserForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const departments = useDepartments();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('staff');
  const [departmentId, setDepartmentId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const password = generatePassword();
    const { data, error: fnErr } = await supabase.functions.invoke('create-user', {
      body: { email, password, full_name: fullName, role, department_id: departmentId || null },
    });
    setBusy(false);
    const failure =
      fnErr?.message ??
      (data && typeof data === 'object' && 'error' in data ? (data as { error: string }).error : null);
    if (fnErr || failure) {
      setError(typeof failure === 'string' ? failure : 'Could not create the user.');
      return;
    }
    setCreated({ email, password });
    void qc.invalidateQueries({ queryKey: ['people'] });
  };

  if (created) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm">
          <strong>{created.email}</strong> can now sign in with this one-time password:
        </p>
        <div className="card bg-surface-panel p-4 font-mono text-lg tracking-wide">{created.password}</div>
        <button
          className="btn-secondary w-full"
          onClick={() => {
            void navigator.clipboard.writeText(created.password);
            toast.success('Password copied');
          }}
        >
          <Copy size={15} /> Copy password
        </button>
        <p className="text-xs text-ink-muted">
          Share it securely — it is shown only once. The user should change it after first sign-in.
        </p>
        <button className="btn-primary w-full" onClick={onDone}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div>
        <label htmlFor="u_name" className="block text-sm font-medium mb-1">
          Full name
        </label>
        <input id="u_name" className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label htmlFor="u_email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input id="u_email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="u_role" className="block text-sm font-medium mb-1">
            Role
          </label>
          <select id="u_role" className="input" value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
            {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="u_dept" className="block text-sm font-medium mb-1">
            Department
          </label>
          <select id="u_dept" className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">—</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
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
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create user'}
        </button>
      </div>
    </form>
  );
}
