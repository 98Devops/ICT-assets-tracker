import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssignForm } from './AssignForm';
import { Providers, makeProfile } from '@/test/mocks';

const inserted: unknown[] = [];
const dbState = { error: null as null | { code?: string; message: string } };

vi.mock('@/lib/supabase', () => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'order', 'limit', 'eq', 'insert', 'update', 'single', 'is', 'not']) {
      c[m] = vi.fn((arg: unknown) => {
        if (m === 'insert') inserted.push(arg);
        return c;
      });
    }
    c.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: dbState.error, count: 0 });
    return c;
  };
  return { supabase: { from: vi.fn(() => chain()) } };
});

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ profile: makeProfile('technician') }),
}));

vi.mock('@/features/admin/lookups', () => ({
  usePeople: () => ({
    data: [
      { id: '3c9e6f60-9e2b-4c33-a5f5-000000000001', full_name: 'Tinashe Gumbo' },
      { id: '3c9e6f60-9e2b-4c33-a5f5-000000000002', full_name: 'Grace Mutasa' },
    ],
  }),
}));

const ASSET_ID = '3c9e6f60-9e2b-4c33-a5f5-00000000aaaa';

describe('AssignForm', () => {
  beforeEach(() => {
    inserted.length = 0;
    dbState.error = null;
  });

  it('requires a person before submitting', async () => {
    render(
      <Providers>
        <AssignForm assetId={ASSET_ID} onDone={vi.fn()} />
      </Providers>,
    );
    await userEvent.click(screen.getByRole('button', { name: /assign asset/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/choose a person/i);
    expect(inserted).toHaveLength(0);
  });

  it('records a valid assignment with the signed-in user as assigner', async () => {
    const onDone = vi.fn();
    render(
      <Providers>
        <AssignForm assetId={ASSET_ID} onDone={onDone} />
      </Providers>,
    );
    await userEvent.selectOptions(screen.getByLabelText(/assign to/i), 'Tinashe Gumbo');
    await userEvent.click(screen.getByRole('button', { name: /assign asset/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const row = inserted[0] as Record<string, unknown>;
    expect(row.asset_id).toBe(ASSET_ID);
    expect(row.assigned_by).toBe('user-1'); // from the mocked profile
    expect(row.organization_id).toBe('org-1');
  });

  it('surfaces the one-open-assignment violation as a human sentence', async () => {
    dbState.error = { code: '23505', message: 'duplicate key value violates unique index' };
    render(
      <Providers>
        <AssignForm assetId={ASSET_ID} onDone={vi.fn()} />
      </Providers>,
    );
    await userEvent.selectOptions(screen.getByLabelText(/assign to/i), 'Grace Mutasa');
    await userEvent.click(screen.getByRole('button', { name: /assign asset/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already assigned/i);
  });
});
