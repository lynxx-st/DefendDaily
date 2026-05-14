import { requireCisoOrAdmin } from '@/lib/auth-guard'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['Daily puzzles (all types)', 'Slack & Teams bot', 'Basic leaderboard', 'Up to 50 users'],
  growth: ['Everything in Starter', 'Phishing simulations', 'CISO dashboard & heatmap', 'Compliance PDF export', 'Risk Score automation', 'Unlimited users'],
  enterprise: ['Everything in Growth', 'Okta / Azure AD integration', 'SAML/OIDC SSO', 'SCIM provisioning', 'MSP partner portal', 'SLA + dedicated support'],
}

export default async function BillingPage() {
  const session = await requireCisoOrAdmin()

  let status = { plan: 'starter', plan_status: 'trialing', plan_expires_at: null as string | null }
  try {
    status = await api.getBillingStatus(session)
  } catch { /* show defaults */ }

  const statusVariant = status.plan_status === 'active' ? 'success'
    : status.plan_status === 'past_due' ? 'error' : 'default'

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/settings" className="text-muted hover:text-body transition">
          <ArrowLeft size={18} />
        </Link>
        <PageHeader title="Billing" description="Manage your plan, seats, and payment method." />
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-body-strong font-medium capitalize">{status.plan} Plan</h2>
            {status.plan_expires_at && (
              <p className="text-muted text-body-sm mt-1">
                {status.plan_status === 'trialing' ? 'Trial ends' : 'Renews'}: {status.plan_expires_at}
              </p>
            )}
          </div>
          <Badge variant={statusVariant} className="capitalize">{status.plan_status.replace('_', ' ')}</Badge>
        </div>

        <ul className="space-y-1.5">
          {(PLAN_FEATURES[status.plan] ?? []).map(f => (
            <li key={f} className="text-body-sm text-muted flex items-center gap-2">
              <span className="text-semantic-success text-xs">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </Card>

      {status.plan !== 'enterprise' && (
        <div className="grid sm:grid-cols-2 gap-4">
          {(['growth', 'enterprise'] as const)
            .filter(p => p !== status.plan)
            .map(plan => (
              <Card key={plan} className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-body-strong font-medium capitalize">{plan}</h3>
                  <span className="text-muted text-body-sm">
                    ${plan === 'growth' ? 10 : 14}/user/yr
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {(PLAN_FEATURES[plan] ?? []).slice(0, 4).map(f => (
                    <li key={f} className="text-body-sm text-muted flex items-center gap-2">
                      <span className="text-primary text-xs">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <form action="/api/billing/checkout" method="POST">
                  <input type="hidden" name="plan" value={plan} />
                  <input type="hidden" name="seat_count" value="50" />
                  <Button type="submit" variant={plan === 'growth' ? 'primary' : 'outline'} className="w-full">
                    <ExternalLink size={13} />
                    Upgrade to {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </Button>
                </form>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}
