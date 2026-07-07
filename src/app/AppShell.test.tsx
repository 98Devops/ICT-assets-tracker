import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from './AppShell';
import { Providers, makeProfile } from '@/test/mocks';
import type { AppRole } from '@/lib/types';

const authState: { profile: ReturnType<typeof makeProfile> } = { profile: makeProfile('staff') };

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ profile: authState.profile, signOut: vi.fn(), session: {}, loading: false }),
}));

vi.mock('@/features/admin/lookups', () => ({
  useOrganization: () => ({ data: { name: 'Test Org', logoUrl: null } }),
}));

function renderShellAs(role: AppRole) {
  authState.profile = makeProfile(role);
  return render(
    <Providers>
      <AppShell />
    </Providers>,
  );
}

describe('role-gated navigation', () => {
  it('staff do not see Reports or Admin', () => {
    renderShellAs('staff');
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /assets/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /reports/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('auditor sees Reports but not Admin', () => {
    renderShellAs('auditor');
    expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('super_admin sees everything', () => {
    renderShellAs('super_admin');
    expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();
  });

  it('shows the org name in the sidebar', () => {
    renderShellAs('staff');
    expect(screen.getByText('Test Org')).toBeInTheDocument();
  });
});
