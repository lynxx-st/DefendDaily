import { Skeleton } from '@/components/ui/Skeleton'

export default function EffectivenessLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="rounded-xl border border-hairline overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-none border-b border-hairline last:border-0" />
        ))}
      </div>
    </div>
  )
}
