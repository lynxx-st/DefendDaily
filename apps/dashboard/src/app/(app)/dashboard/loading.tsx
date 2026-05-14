import { Skeleton, SkeletonCard, SkeletonPageHeader } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div>
      <SkeletonPageHeader />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="rounded-xl border border-hairline bg-surface-card p-5">
          <Skeleton className="mb-5 h-3.5 w-28" />
          <div className="grid grid-cols-6 gap-2.5">
            {Array.from({ length: 18 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-hairline bg-surface-card p-5">
          <Skeleton className="h-[120px] w-[120px] rounded-pill" />
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-hairline bg-surface-card p-5">
          <Skeleton className="mb-5 h-3.5 w-36" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
        <div className="overflow-hidden rounded-xl border border-hairline bg-surface-card">
          <div className="border-b border-hairline p-5">
            <Skeleton className="h-3.5 w-28" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-hairline px-4 py-3.5 last:border-0">
              <Skeleton className="h-6 w-6 shrink-0 rounded-pill" />
              <Skeleton className="h-2.5 flex-1" />
              <Skeleton className="h-2.5 w-14 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
