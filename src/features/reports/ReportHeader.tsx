import { useOrganization } from '@/features/admin/lookups';
import { useAuth } from '@/features/auth/AuthContext';
import { IatsLogo } from '@/components/branding/IatsLogo';
import { formatDate } from '@/lib/utils';

/** Branded header rendered above reports; shines in print. */
export function ReportHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const org = useOrganization();
  const { profile } = useAuth();
  return (
    <div className="hidden print:block mb-6 border-b-2 border-ink pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {org.data?.logoUrl ? (
            <img src={org.data.logoUrl} alt="" className="h-12 w-12 object-contain" />
          ) : (
            <IatsLogo size={48} />
          )}
          <div>
            <div className="font-display text-xl font-semibold">{org.data?.name ?? ''}</div>
            <div className="text-sm text-ink-muted">{title}</div>
          </div>
        </div>
        <div className="text-right text-xs text-ink-muted">
          <div>Generated {formatDate(new Date().toISOString())}</div>
          <div>By {profile?.full_name}</div>
          {subtitle && <div>{subtitle}</div>}
        </div>
      </div>
      <div className="mt-2 text-[10px] text-ink-muted">
        ICT Assets Tracker System (IATS) — records are append-only and audit-logged.
      </div>
    </div>
  );
}
