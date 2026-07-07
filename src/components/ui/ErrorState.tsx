import { AlertTriangle } from 'lucide-react';

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card p-8 flex flex-col items-center text-center gap-3">
      <AlertTriangle size={24} className="text-status-faulty" />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
