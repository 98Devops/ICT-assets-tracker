import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { returnSchema, useReturn } from './api';

export function ReturnForm({ assignmentId, onDone }: { assignmentId: string; onDone: () => void }) {
  const ret = useReturn();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [condition, setCondition] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = returnSchema.safeParse({ returned_date: date, return_condition: condition });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form.');
      return;
    }
    try {
      await ret.mutateAsync({ id: assignmentId, values: parsed.data });
      toast.success('Return recorded');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="returned_date" className="block text-sm font-medium mb-1">
          Return date
        </label>
        <input id="returned_date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label htmlFor="return_condition" className="block text-sm font-medium mb-1">
          Condition at return
        </label>
        <textarea
          id="return_condition"
          rows={2}
          className="input"
          placeholder="e.g. Good — minor scuffs on lid"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        />
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
        <button type="submit" className="btn-primary" disabled={ret.isPending}>
          {ret.isPending ? 'Saving…' : 'Record return'}
        </button>
      </div>
    </form>
  );
}
