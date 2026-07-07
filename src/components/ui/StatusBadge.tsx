import type { AssetStatus } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';

const styles: Record<AssetStatus, string> = {
  active: 'bg-status-active/10 text-status-active',
  faulty: 'bg-status-faulty/10 text-status-faulty',
  in_repair: 'bg-status-repair/10 text-status-repair',
  retired: 'bg-status-retired/10 text-status-retired',
  lost: 'border border-status-lost text-status-lost bg-transparent',
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  return <span className={cn('badge', styles[status])}>{STATUS_LABELS[status]}</span>;
}
