export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded-md ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-hairline bg-surface-card p-5">
      <div className="flex items-start justify-between">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-4 w-4 rounded-sm" />
      </div>
      <Skeleton className="mt-4 h-8 w-24" />
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="h-2.5 w-32" />
        <Skeleton className="h-2.5 w-12" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-hairline px-4 py-3.5 last:border-0">
      <Skeleton className="h-8 w-8 shrink-0 rounded-pill" />
      <div className="flex flex-1 items-center gap-6">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-6 w-12 shrink-0 rounded-pill" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-hairline">
      <div className="border-b border-hairline bg-surface-card-elevated px-4 py-3">
        <div className="flex items-center gap-6">
          <Skeleton className="h-2.5 w-32" />
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonPageHeader() {
  return (
    <header className="mb-8">
      <Skeleton className="mb-3 h-2 w-16" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-96" />
    </header>
  );
}

export function SkeletonStatGrid({ cols = 4 }: { cols?: number }) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-${cols}`}>
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
