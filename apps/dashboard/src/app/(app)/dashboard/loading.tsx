export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded-sm bg-surface-card-elevated" />
        <div className="h-9 w-64 animate-pulse rounded-md bg-surface-card-elevated" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-card" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-xl bg-surface-card lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-xl bg-surface-card" />
      </div>
    </div>
  );
}
