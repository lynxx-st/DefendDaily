'use client'

import { useState } from 'react'
import type { CohortRow } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { TrendingUp, ShieldCheck, DollarSign } from 'lucide-react'

interface Props {
  cohortData: CohortRow[]
}

const INPUT = 'w-full rounded-lg border border-hairline bg-surface-card px-3 py-2 text-body text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition'

export function RoiCalculator({ cohortData }: Props) {
  const [avgBreachCost, setAvgBreachCost] = useState(4_450_000)
  const [insuranceDiscount, setInsuranceDiscount] = useState(15)

  const totalUsers = cohortData.reduce((s, c) => s + parseInt(c.user_count, 10), 0)
  const weightedScore = cohortData.reduce(
    (s, c) => s + parseInt(c.avg_score, 10) * parseInt(c.user_count, 10),
    0,
  )
  const avgScore = totalUsers > 0 ? weightedScore / totalUsers : 50
  const riskReduction = Math.max(Math.round((avgScore - 50) * 0.4), 0)
  const breachCostAvoided = Math.round((avgBreachCost * riskReduction) / 100)
  const insuranceSavings = Math.round((avgBreachCost * insuranceDiscount) / 100 / 12)
  const annualPlatformCost = totalUsers * 10

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-body-sm font-medium text-body-strong">
              Average Breach Cost (USD)
            </label>
            <p className="text-xs text-muted">IBM Cost of a Data Breach 2024 average: $4.45M</p>
            <input
              type="number"
              min={0}
              step={100000}
              className={INPUT}
              value={avgBreachCost}
              onChange={e => setAvgBreachCost(Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-body-sm font-medium text-body-strong">
              Cyber Insurance Discount (%)
            </label>
            <p className="text-xs text-muted">Documented training programs typically earn 10–20% premium reduction</p>
            <input
              type="number"
              min={0}
              max={50}
              step={1}
              className={INPUT}
              value={insuranceDiscount}
              onChange={e => setInsuranceDiscount(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
            />
          </div>

          <div className="rounded-xl border border-hairline bg-surface-card p-4 space-y-3 text-sm">
            <p className="text-body-sm font-medium text-body-strong">How this is calculated</p>
            <p className="text-muted leading-relaxed">
              Risk reduction = (Avg score − 50) × 0.4. A score of {Math.round(avgScore)} across {totalUsers.toLocaleString()} users
              implies a {riskReduction}% reduction in breach probability, applied to your breach cost estimate.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-5 flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
              <ShieldCheck size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-muted text-body-sm">Org Average Risk Score</p>
              <p className="text-3xl font-medium text-body-strong tabular-nums mt-1">
                {Math.round(avgScore)}<span className="text-muted text-base">/100</span>
              </p>
              <p className="text-xs text-muted mt-1">{totalUsers.toLocaleString()} active users</p>
            </div>
          </Card>

          <Card className="p-5 flex items-start gap-4">
            <div className="rounded-lg bg-semantic-success/10 p-2.5 shrink-0">
              <TrendingUp size={18} className="text-semantic-success" />
            </div>
            <div>
              <p className="text-muted text-body-sm">Estimated Breach Cost Avoided</p>
              <p className="text-3xl font-medium text-semantic-success tabular-nums mt-1">
                ${breachCostAvoided.toLocaleString()}
              </p>
              <p className="text-xs text-muted mt-1">{riskReduction}% risk reduction vs. untrained baseline</p>
            </div>
          </Card>

          <Card className="p-5 flex items-start gap-4">
            <div className="rounded-lg bg-semantic-success/10 p-2.5 shrink-0">
              <DollarSign size={18} className="text-semantic-success" />
            </div>
            <div>
              <p className="text-muted text-body-sm">Insurance Premium Saved / mo</p>
              <p className="text-3xl font-medium text-semantic-success tabular-nums mt-1">
                ${insuranceSavings.toLocaleString()}
              </p>
              <p className="text-xs text-muted mt-1">
                vs. platform cost of ~${(annualPlatformCost / 12).toLocaleString()}/mo (Growth tier)
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
