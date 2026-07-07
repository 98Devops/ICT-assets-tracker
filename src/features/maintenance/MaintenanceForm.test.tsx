import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MaintenanceForm } from './MaintenanceForm';
import { Providers, makeProfile } from '@/test/mocks';

const inserted: unknown[] = [];

vi.mock('@/lib/supabase', () => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'order', 'limit', 'eq', 'insert', 'update', 'single']) {
      c[m] = vi.fn((arg: unknown) => {
        if (m === 'insert') inserted.push(arg);
        return c;
      });
    }
    c.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null, count: 0 });
    return c;
  };
  return { supabase: { from: vi.fn(() => chain()) } };
});

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ profile: makeProfile('technician') }),
}));

const ASSET_ID = '3c9e6f60-9e2b-4c33-a5f5-00000000bbbb';

describe('MaintenanceForm', () => {
  beforeEach(() => {
    inserted.length = 0;
  });

  it('requires a description of the work', async () => {
    render(
      <Providers>
        <MaintenanceForm assetId={ASSET_ID} onDone={vi.fn()} />
      </Providers>,
    );
    await userEvent.click(screen.getByRole('button', { name: /log maintenance/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/describe the work/i);
    expect(inserted).toHaveLength(0);
  });

  it('logs a repair with cost and stamps the creator', async () => {
    const onDone = vi.fn();
    render(
      <Providers>
        <MaintenanceForm assetId={ASSET_ID} onDone={onDone} />
      </Providers>,
    );
    await userEvent.selectOptions(screen.getByLabelText(/type/i), 'Part Replacement');
    await userEvent.type(screen.getByLabelText(/description/i), 'Replaced projector lamp ELPLP97');
    await userEvent.type(screen.getByLabelText(/cost/i), '85');
    await userEvent.type(screen.getByLabelText(/performed by/i), 'Blessing Ndlovu');
    await userEvent.click(screen.getByRole('button', { name: /log maintenance/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const row = inserted[0] as Record<string, unknown>;
    expect(row.asset_id).toBe(ASSET_ID);
    expect(row.type).toBe('part_replacement');
    expect(row.cost).toBe(85);
    expect(row.created_by).toBe('user-1');
    expect(row.organization_id).toBe('org-1');
  });
});
