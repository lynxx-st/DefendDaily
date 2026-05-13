import { Skeleton, SkeletonPageHeader, SkeletonRow } from '@/components/ui/Skeleton';

export default function TeamLoading() {
  return (
    <div>
      <SkeletonPageHeader />

      {/* Badge strip */}
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-6 w-20 rounded-pill" />
        <Skeleton className="h-6 w-28 rounded-pill" />
      </div>

      {/* Search bar */}
      <div className="mb-6 flex items-center gap-3 rounded-md border border-hairline bg-surface-card px-3 py-2.5">
        <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
        <Skeleton className="h-3.5 w-48" />
      </div>

      {/* User cards grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-hairline bg-surface-card p-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-pill" />
            <div className="flex-1">
              <Skeleton className="mb-2 h-3.5 w-32" />
              <Skeleton className="mb-2 h-2.5 w-40" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <Skeleton className="h-10 w-10 shrink-0 rounded-pill" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-hairline">
        <div className="border-b border-hairline bg-surface-card-elevated px-4 py-3">
          <div className="flex gap-8">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-2.5 w-14" />
          </div>
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
