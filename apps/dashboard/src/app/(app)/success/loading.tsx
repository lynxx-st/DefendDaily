import { Skeleton } from '@/components/ui/Skeleton'

export default function SuccessLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    </div>
  )
}
