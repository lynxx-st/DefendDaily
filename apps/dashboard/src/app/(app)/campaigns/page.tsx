import { requireCisoOrAdmin } from '@/lib/auth-guard'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { CampaignManager } from '@/components/campaigns/CampaignManager'

export default async function CampaignsPage() {
  const session = await requireCisoOrAdmin()

  let campaigns: Awaited<ReturnType<typeof api.getCampaigns>>['campaigns'] = []
  try {
    const data = await api.getCampaigns(session)
    campaigns = data.campaigns
  } catch {
    // empty state
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Training Campaigns"
        description="Schedule themed training weeks with targeted puzzle types and difficulty settings."
      />
      <CampaignManager initial={campaigns} />
    </div>
  )
}
