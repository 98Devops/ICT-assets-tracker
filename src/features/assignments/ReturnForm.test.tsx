import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReturnForm } from './ReturnForm';
import { Providers } from '@/test/mocks';

const updated: unknown[] = [];
const dbState = { error: null as null | { message: string } };

vi.mock('@/lib/supabase', () => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'order', 'limit', 'eq', 'insert', 'update', 'single']) {
      c[m] = vi.fn((arg: unknown) => {
        if (m === 'update') updated.push(arg);
        return c;
      });
    }
    c.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: dbState.error, count: 0 });
    return c;
  };
  return { supabase: { from: vi.fn(() => chain()) } };
});

describe('ReturnForm', () => {
  beforeEach(() => {
    updated.length = 0;
    dbState.error = null;
  });

  it('requires a return condition', async () => {
    render(
      <Providers>
        <ReturnForm assignmentId="asg-1" onDone={vi.fn()} />
      </Providers>,
    );
    await userEvent.click(screen.getByRole('button', { name: /record return/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/condition/i);
    expect(updated).toHaveLength(0);
  });

  it('records the return with date and condition', async () => {
    const onDone = vi.fn();
    render(
      <Providers>
        <ReturnForm assignmentId="asg-1" onDone={onDone} />
      </Providers>,
    );
    await userEvent.type(screen.getByLabelText(/condition at return/i), 'Good — minor scuffs');
    await userEvent.click(screen.getByRole('button', { name: /record return/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const row = updated[0] as { returned_date: string; return_condition: string };
    expect(row.return_condition).toBe('Good — minor scuffs');
    expect(row.returned_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('shows a human error when the database rejects the update', async () => {
    dbState.error = { message: 'permission denied' };
    render(
      <Providers>
        <ReturnForm assignmentId="asg-1" onDone={vi.fn()} />
      </Providers>,
    );
    await userEvent.type(screen.getByLabelText(/condition at return/i), 'Working');
    await userEvent.click(screen.getByRole('button', { name: /record return/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not record the return/i);
  });
});
