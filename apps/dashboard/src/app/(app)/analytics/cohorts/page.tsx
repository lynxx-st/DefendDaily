import { requireCisoOrAdmin } from '@/lib/auth-guard'
import { api, type CohortRow } from '@/lib/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { TrendingUp, Calculator } from 'lucide-react'

const COHORT_LABEL: Record<string, string> = {
  new_hire: 'New Hires',
  day_30_90: '30–90 Days',
  veteran: 'Veterans',
}

const COHORT_DESC: Record<string, string> = {
  new_hire: 'Joined in the last 30 days',
  day_30_90: 'Between 30 and 90 days tenure',
  veteran: 'More than 90 days tenure',
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-semantic-success'
  if (score >= 50) return 'text-semantic-warning'
  return 'text-semantic-error'
}

function AccuracyBar({ value }: { value: number }) {
  return (
    <div className="mt-3 space-y-1">
      <div className="flex justify-between text-xs text-muted">
        <span>30-day accuracy</span>
        <span className="tabular-nums">{isNaN(value) ? '—' : `${value}%`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-strong overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(isNaN(value) ? 0 : value, 100)}%`,
            background: value >= 70 ? 'var(--color-semantic-success)' : value >= 50 ? 'var(--color-semantic-warning)' : 'var(--color-semantic-error)',
          }}
        />
      </div>
    </div>
  )
}

export default async function CohortAnalysisPage() {
  const session = await requireCisoOrAdmin()
  let cohorts: CohortRow[] = []
  try {
    const data = await api.getCohorts(session)
    cohorts = data.cohorts
  } catch {
    // show empty state
  }

  const totalUsers = cohorts.reduce((s, c) => s + parseInt(c.user_count, 10), 0)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Cohort Analysis"
          description="Compare risk score and puzzle accuracy across employee tenure cohorts."
        />
        <Link href="/analytics/roi">
          <Button variant="outline" size="sm">
            <Calculator size={14} />
            ROI Calculator
          </Button>
        </Link>
      </div>

      {cohorts.length === 0 ? (
        <Card className="p-12 text-center text-muted">
          No user data yet. Cohorts will appear once your team starts receiving daily puzzles.
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            {(['new_hire', 'day_30_90', 'veteran'] as const).map(key => {
              const cohort = cohorts.find(c => c.cohort === key)
              const score = cohort ? parseInt(cohort.avg_score, 10) : 0
              const accuracy = cohort ? parseFloat(cohort.accuracy) : NaN
              const users = cohort ? parseInt(cohort.user_count, 10) : 0
              const pct = totalUsers > 0 ? Math.round((users / totalUsers) * 100) : 0

              return (
                <Card key={key} className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-body-sm text-muted">{COHORT_LABEL[key]}</p>
                      <p className="text-xs text-muted/60 mt-0.5">{COHORT_DESC[key]}</p>
                    </div>
                    <Badge variant="default">{pct}% of org</Badge>
                  </div>

                  <div>
                    <span className={`text-3xl font-medium tabular-nums ${cohort ? scoreColor(score) : 'text-muted'}`}>
                      {cohort ? score : '—'}
                    </span>
                    <span className="text-muted text-sm">/100</span>
                  </div>

                  <p className="text-body-sm text-muted tabular-nums">
                    {cohort ? users.toLocaleString() : 0} users
                    {cohort && ` · ${cohort.avg_streak ?? 0}d avg streak`}
                  </p>

                  <AccuracyBar value={accuracy} />
                </Card>
              )
            })}
          </div>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-primary" />
              <h2 className="text-body-strong font-medium">Cohort Comparison</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline">
                    {['Cohort', 'Users', 'Avg Score', 'Avg Streak', '30-day Accuracy'].map(h => (
                      <th key={h} className="pb-3 text-left text-muted font-medium text-body-sm">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {cohorts.map(row => {
                    const score = parseInt(row.avg_score, 10)
                    const accuracy = parseFloat(row.accuracy)
                    return (
                      <tr key={row.cohort}>
                        <td className="py-3 text-body-strong font-medium">{COHORT_LABEL[row.cohort] ?? row.cohort}</td>
                        <td className="py-3 text-body tabular-nums">{parseInt(row.user_count, 10).toLocaleString()}</td>
                        <td className={`py-3 tabular-nums font-medium ${scoreColor(score)}`}>{score}</td>
                        <td className="py-3 text-body tabular-nums">{row.avg_streak}d</td>
                        <td className="py-3 text-body tabular-nums">{isNaN(accuracy) ? '—' : `${accuracy}%`}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
