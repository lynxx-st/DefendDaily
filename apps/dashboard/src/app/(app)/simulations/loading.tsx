import { Skeleton, SkeletonCard, SkeletonPageHeader, SkeletonTable } from '@/components/ui/Skeleton';

export default function SimulationsLoading() {
  return (
    <div>
      <SkeletonPageHeader />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      <div className="mb-6 rounded-xl border border-hairline bg-surface-card p-5">
        <Skeleton className="mb-5 h-3.5 w-40" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>

      <SkeletonTable rows={8} />
    </div>
  );
}
