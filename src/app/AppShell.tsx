import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  Wrench,
  FileBarChart,
  ScanLine,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react';
import { useState } from 'react';
import { IatsWordmark } from '@/components/branding/IatsLogo';
import { useAuth } from '@/features/auth/AuthContext';
import { useOrganization } from '@/features/admin/lookups';
import { can } from '@/features/auth/roles';
import { ROLE_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/assets', label: 'Assets', icon: Boxes },
  { to: '/assignments', label: 'Assignments', icon: ArrowLeftRight },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/scan', label: 'Scan', icon: ScanLine },
  { to: '/reports', label: 'Reports', icon: FileBarChart, gate: 'reports' as const },
  { to: '/admin', label: 'Admin', icon: Settings, gate: 'manageOrg' as const },
];

export function AppShell() {
  const { profile, signOut } = useAuth();
  const org = useOrganization();
  const [open, setOpen] = useState(false);
  if (!profile) return null;

  const items = NAV.filter((n) => !n.gate || can[n.gate](profile.role));

  const nav = (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
              isActive
                ? 'bg-ember/15 text-white border-l-2 border-ember'
                : 'text-white/65 hover:text-white hover:bg-white/5',
            )
          }
        >
          <Icon size={17} strokeWidth={1.8} />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-surface">
      {/* sidebar */}
      <aside
        className={cn(
          'no-print fixed inset-y-0 left-0 z-40 w-60 bg-ink flex flex-col transition-transform md:translate-x-0 md:static',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="px-4 py-5 border-b border-white/10">
          <IatsWordmark orgName={org.data?.name} logoUrl={org.data?.logoUrl} />
        </div>
        {nav}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="text-sm text-white font-medium truncate">{profile.full_name}</div>
          <div className="text-xs text-white/50 mb-3">{ROLE_LABELS[profile.role]}</div>
          <button
            onClick={() => void signOut()}
            className="flex items-center gap-2 text-sm text-white/65 hover:text-white transition"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-ink/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* content */}
      <div className="flex-1 min-w-0">
        <header className="no-print md:hidden sticky top-0 z-20 flex items-center gap-3 bg-ink px-4 py-3">
          <button aria-label="Open menu" className="text-white" onClick={() => setOpen(true)}>
            <Menu size={22} />
          </button>
          <span className="font-display text-white font-semibold">IATS</span>
        </header>
        <main className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
