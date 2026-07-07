export function PageSkeleton() {
  return (
    <div className="p-8 space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 rounded-md bg-surface-panel" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-lg bg-surface-panel" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-surface-panel" />
    </div>
  );
}
