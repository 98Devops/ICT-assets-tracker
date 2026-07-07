/** Temporary placeholder for feature pages while slices are built out. */
export function PagePlaceholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">{title}</h1>
      <div className="card p-10 text-center text-ink-muted text-sm">
        This section is being built next.
      </div>
    </div>
  );
}
