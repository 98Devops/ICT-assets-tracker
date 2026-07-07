import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetForm } from './AssetForm';
import { Providers, makeProfile } from '@/test/mocks';

const inserted: unknown[] = [];

vi.mock('@/lib/supabase', () => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    const self = () => c;
    for (const m of ['select', 'order', 'limit', 'eq', 'insert', 'update', 'single']) {
      c[m] = vi.fn((arg: unknown) => {
        if (m === 'insert') inserted.push(arg);
        return c;
      });
    }
    // awaited terminal: PostgrestBuilder is thenable
    c.then = (resolve: (v: unknown) => void) =>
      resolve({ data: inserted.length ? { id: 'a-1', ...(inserted[0] as object) } : [], error: null, count: 0 });
    return self();
  };
  return { supabase: { from: vi.fn(() => chain()) } };
});

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ profile: makeProfile('ict_manager') }),
}));

vi.mock('@/features/admin/lookups', () => ({
  useDepartments: () => ({ data: [] }),
  useSuppliers: () => ({ data: [] }),
}));

describe('AssetForm', () => {
  beforeEach(() => {
    inserted.length = 0;
  });

  it('shows field-level validation errors and blocks submit', async () => {
    render(
      <Providers>
        <AssetForm onDone={vi.fn()} />
      </Providers>,
    );
    // submit with the required Name left empty (tag is auto-suggested by design)
    await userEvent.click(screen.getByRole('button', { name: /register asset/i }));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(inserted).toHaveLength(0);
  });

  it('submits a valid asset and calls onDone', async () => {
    const onDone = vi.fn();
    render(
      <Providers>
        <AssetForm onDone={onDone} />
      </Providers>,
    );
    await userEvent.type(screen.getByLabelText(/asset tag/i), 'ICT-9999');
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Test Laptop');
    await userEvent.click(screen.getByRole('button', { name: /register asset/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(inserted.length).toBeGreaterThan(0);
    const row = inserted[0] as { asset_tag: string; organization_id: string };
    expect(row.asset_tag).toContain('ICT-9999');
    expect(row.organization_id).toBe('org-1');
  });
});
