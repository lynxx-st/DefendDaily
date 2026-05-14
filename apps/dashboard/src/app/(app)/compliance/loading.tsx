import { Skeleton, SkeletonCard, SkeletonPageHeader } from '@/components/ui/Skeleton';

export default function ComplianceLoading() {
  return (
    <div>
      <SkeletonPageHeader />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Export card */}
      <div className="rounded-xl border border-hairline bg-surface-card p-7">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="mb-3 h-4 w-48" />
            <Skeleton className="mb-2 h-3 w-80" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-10 w-32 shrink-0 rounded-md" />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-hairline p-4">
              <Skeleton className="h-5 w-5 shrink-0 rounded-sm" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
