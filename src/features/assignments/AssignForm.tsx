import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthContext';
import { usePeople } from '@/features/admin/lookups';
import { assignSchema, useAssign } from './api';

export function AssignForm({ assetId, onDone }: { assetId: string; onDone: () => void }) {
  const { profile } = useAuth();
  const people = usePeople();
  const assign = useAssign(profile!.organization_id, profile!.id);
  const [assignedTo, setAssignedTo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [expected, setExpected] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = assignSchema.safeParse({
      asset_id: assetId,
      assigned_to: assignedTo,
      assigned_date: date,
      expected_return_date: expected,
      notes,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form.');
      return;
    }
    try {
      await assign.mutateAsync(parsed.data);
      toast.success('Assignment recorded');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="assigned_to" className="block text-sm font-medium mb-1">
          Assign to
        </label>
        <select id="assigned_to" className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
          <option value="">Choose a person…</option>
          {(people.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="assigned_date" className="block text-sm font-medium mb-1">
            Date
          </label>
          <input id="assigned_date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor="expected_return" className="block text-sm font-medium mb-1">
            Expected return
          </label>
          <input id="expected_return" type="date" className="input" value={expected} onChange={(e) => setExpected(e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="assign_notes" className="block text-sm font-medium mb-1">
          Notes
        </label>
        <textarea id="assign_notes" rows={2} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
        <button type="submit" className="btn-primary" disabled={assign.isPending}>
          {assign.isPending ? 'Saving…' : 'Assign asset'}
        </button>
      </div>
    </form>
  );
}
