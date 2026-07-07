import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card p-12 flex flex-col items-center text-center gap-3">
      <div className="rounded-full bg-surface-panel p-4">
        <Icon size={28} className="text-ink-muted" strokeWidth={1.5} />
      </div>
      <p className="font-medium">{title}</p>
      {hint && <p className="text-sm text-ink-muted max-w-sm">{hint}</p>}
      {action}
    </div>
  );
}
