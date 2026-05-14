import { Skeleton } from '@/components/ui/Skeleton'

export default function CampaignsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-88" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
      </div>
    </div>
  )
}
