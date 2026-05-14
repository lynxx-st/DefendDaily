import { requireCisoOrAdmin } from '@/lib/auth-guard'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Activity, Users, Shield, Calendar } from 'lucide-react'

type HealthScore = {
  adoption_pct: number
  active_7d: number
  avg_score: number
  renewal_date: string | null
}

export default async function SuccessPage() {
  const session = await requireCisoOrAdmin()

  let health: HealthScore = { adoption_pct: 0, active_7d: 0, avg_score: 0, renewal_date: null }
  let billingStatus = { plan: 'starter', plan_status: 'trialing', plan_expires_at: null as string | null }

  try {
    const [h, b] = await Promise.all([
      api.getHealthScore(session),
      api.getBillingStatus(session),
    ])
    health = h
    billingStatus = b
  } catch {
    // show defaults
  }

  const statusVariant = billingStatus.plan_status === 'active' ? 'success'
    : billingStatus.plan_status === 'past_due' ? 'error'
    : 'default'

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Account Health"
          description="Adoption metrics, risk posture, and subscription status for your organization."
        />
        <Badge variant={statusVariant} className="capitalize mt-1">
          {billingStatus.plan_status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          label="7-Day Adoption"
          value={`${health.adoption_pct}%`}
          icon={<Activity size={16} />}
          hint={health.adoption_pct >= 60 ? 'On track' : 'Below target'}
          accent={health.adoption_pct >= 60 ? 'success' : 'danger'}
        />
        <StatCard
          label="Active Users (7d)"
          value={health.active_7d.toLocaleString()}
          icon={<Users size={16} />}
        />
        <StatCard
          label="Avg Risk Score"
          value={`${health.avg_score}/100`}
          icon={<Shield size={16} />}
          hint={health.avg_score >= 70 ? 'Healthy' : 'Needs improvement'}
          accent={health.avg_score >= 70 ? 'success' : health.avg_score >= 50 ? 'warning' : 'danger'}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5 space-y-4">
          <h2 className="text-body-strong font-medium flex items-center gap-2">
            <Calendar size={15} className="text-muted" />
            Subscription
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted text-body-sm">Plan</span>
              <span className="text-body-strong capitalize font-medium">{billingStatus.plan}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted text-body-sm">Status</span>
              <Badge variant={statusVariant} className="capitalize">
                {billingStatus.plan_status.replace('_', ' ')}
              </Badge>
            </div>
            {billingStatus.plan_expires_at && (
              <div className="flex justify-between items-center">
                <span className="text-muted text-body-sm">Renews</span>
                <span className="text-body tabular-nums">{billingStatus.plan_expires_at}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-body-strong font-medium">Health Indicators</h2>
          <div className="space-y-3">
            {[
              { label: 'Adoption ≥ 60%', ok: health.adoption_pct >= 60 },
              { label: 'Avg Score ≥ 70', ok: health.avg_score >= 70 },
              { label: 'Subscription active', ok: billingStatus.plan_status === 'active' || billingStatus.plan_status === 'trialing' },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${ok ? 'bg-semantic-success' : 'bg-semantic-error'}`} />
                <span className="text-body-sm text-muted">{label}</span>
                <span className={`ml-auto text-xs font-medium ${ok ? 'text-semantic-success' : 'text-semantic-error'}`}>
                  {ok ? 'Good' : 'Needs attention'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
