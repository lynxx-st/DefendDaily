import { requireCisoOrAdmin } from '@/lib/auth-guard'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { RoiCalculator } from '@/components/analytics/RoiCalculator'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function RoiPage() {
  const session = await requireCisoOrAdmin()

  let cohorts: Awaited<ReturnType<typeof api.getCohorts>>['cohorts'] = []
  try {
    const data = await api.getCohorts(session)
    cohorts = data.cohorts
  } catch {
    // use empty state
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/analytics/cohorts" className="text-muted hover:text-body transition">
          <ArrowLeft size={18} />
        </Link>
        <PageHeader
          title="ROI Calculator"
          description="Estimate breach cost reduction and insurance savings based on your team's current Risk Score."
        />
      </div>
      <RoiCalculator cohortData={cohorts} />
    </div>
  )
}
