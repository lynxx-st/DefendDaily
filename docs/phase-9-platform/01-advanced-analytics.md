# Steps 9.01–9.05 — Advanced Analytics

## 9.01 Cohort analysis dashboard

**File:** `apps/api/src/routes/cohortAnalytics.ts`

```typescript
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { db } from '../db/client'

export const cohortRouter = Router()
cohortRouter.use(requireAuth, requireRole('ciso', 'admin'))

cohortRouter.get('/cohorts', async (req, res) => {
  const { orgId } = res.locals.principal!

  const result = await db.query<{
    cohort: string; user_count: string; avg_score: string; avg_streak: string; accuracy: string
  }>(
    `SELECT
       CASE
         WHEN u.created_at >= CURRENT_DATE - 30  THEN 'new_hire'
         WHEN u.created_at >= CURRENT_DATE - 90  THEN 'day_30_90'
         ELSE 'veteran'
       END AS cohort,
       COUNT(DISTINCT u.id)::text AS user_count,
       ROUND(AVG(u.risk_score))::text AS avg_score,
       ROUND(AVG(u.streak))::text AS avg_streak,
       ROUND(
         COUNT(CASE WHEN pd.is_correct THEN 1 END)::numeric /
         NULLIF(COUNT(CASE WHEN pd.status != 'skipped' THEN 1 END), 0) * 100, 1
       )::text AS accuracy
     FROM users u
     LEFT JOIN puzzle_deliveries pd ON pd.user_id = u.id AND pd.delivered_at >= CURRENT_DATE - 30
     WHERE u.org_id = $1
     GROUP BY 1`,
    [orgId],
  )
  res.json({ cohorts: result.rows })
})
```

**File:** `apps/dashboard/src/app/(ciso)/analytics/cohorts/page.tsx`

```typescript
import { requireSession } from '../../../../lib/auth'
import { apiClient } from '../../../../lib/apiClient'

export default async function CohortPage() {
  const session = await requireSession(['ciso', 'admin'])
  const data = await apiClient('/api/analytics/cohorts', session)

  const labels: Record<string, string> = {
    new_hire: 'New Hires (<30d)',
    day_30_90: '30–90 Days',
    veteran: 'Veterans (>90d)',
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-medium text-white">Cohort Analysis</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.cohorts.map((c: { cohort: string; user_count: string; avg_score: string; accuracy: string }) => (
          <div key={c.cohort} className="bg-surface-card rounded-xl p-5 border border-white/5">
            <div className="text-white/50 text-sm mb-1">{labels[c.cohort] ?? c.cohort}</div>
            <div className="text-2xl font-medium text-white">{c.avg_score}<span className="text-white/40 text-sm">/100</span></div>
            <div className="text-sm text-white/50 mt-1">{c.user_count} users · {c.accuracy}% accuracy</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 9.02 Behavioral change score

**File:** `apps/api/src/routes/cohortAnalytics.ts` (add endpoint)

```typescript
cohortRouter.get('/behavioral-change/:userId', async (req, res) => {
  const { orgId } = res.locals.principal!
  const userId = req.params['userId']!

  const result = await db.query<{ period: string; avg_score: string; accuracy: string }>(
    `SELECT
       CASE WHEN rsh.recorded_at <= CURRENT_DATE - 60 THEN 'before' ELSE 'after' END AS period,
       ROUND(AVG(rsh.score))::text AS avg_score,
       ROUND(
         COUNT(CASE WHEN pd.is_correct THEN 1 END)::numeric /
         NULLIF(COUNT(CASE WHEN pd.status != 'skipped' THEN 1 END), 0) * 100, 1
       )::text AS accuracy
     FROM risk_score_history rsh
     JOIN users u ON u.id = rsh.user_id
     LEFT JOIN puzzle_deliveries pd ON pd.user_id = rsh.user_id
       AND pd.delivered_at::date = rsh.recorded_at
     WHERE rsh.user_id = $1 AND u.org_id = $2
       AND rsh.recorded_at >= CURRENT_DATE - 90
     GROUP BY 1`,
    [userId, orgId],
  )

  const before = result.rows.find(r => r.period === 'before')
  const after = result.rows.find(r => r.period === 'after')
  const delta = before && after ? parseInt(after.avg_score) - parseInt(before.avg_score) : null

  res.json({ before, after, delta })
})
```

---

## 9.03 Department risk sparklines

Extend the existing `/api/orgs/:orgId/users` endpoint to include 7/30/90-day trend data per department. The dashboard `team/page.tsx` uses this to render inline sparklines using a lightweight SVG path component:

**File:** `apps/dashboard/src/components/RiskSparkline.tsx`

```typescript
'use client'

interface SparklineProps { scores: number[]; width?: number; height?: number }

export function RiskSparkline({ scores, width = 80, height = 24 }: SparklineProps) {
  if (scores.length < 2) return <span className="text-white/20 text-xs">—</span>
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1
  const step = width / (scores.length - 1)

  const points = scores.map((s, i) => {
    const x = i * step
    const y = height - ((s - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  const latest = scores[scores.length - 1] ?? 50
  const color = latest >= 70 ? '#22c55e' : latest >= 40 ? '#eab308' : '#ef4444'

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  )
}
```

---

## 9.04 ROI calculator page

**File:** `apps/dashboard/src/app/(ciso)/analytics/roi/page.tsx`

```typescript
import { requireSession } from '../../../../lib/auth'
import { apiClient } from '../../../../lib/apiClient'
import { RoiCalculator } from '../../../../components/RoiCalculator'

export default async function RoiPage() {
  const session = await requireSession(['ciso', 'admin'])
  const data = await apiClient('/api/analytics/cohorts', session)
  return <RoiCalculator cohortData={data.cohorts} />
}
```

**File:** `apps/dashboard/src/components/RoiCalculator.tsx`

```typescript
'use client'
import { useState } from 'react'

interface Cohort { user_count: string; avg_score: string }
interface Props { cohortData: Cohort[] }

export function RoiCalculator({ cohortData }: Props) {
  const [avgBreachCost, setAvgBreachCost] = useState(4_450_000) // IBM 2024 average
  const [insuranceDiscount, setInsuranceDiscount] = useState(15)

  const totalUsers = cohortData.reduce((s, c) => s + parseInt(c.user_count), 0)
  const avgScore = cohortData.reduce((s, c) => s + parseInt(c.avg_score) * parseInt(c.user_count), 0) / (totalUsers || 1)
  const riskReduction = Math.round((avgScore - 50) * 0.4)
  const breachCostAvoided = Math.round((avgBreachCost * Math.max(riskReduction, 0)) / 100)
  const insuranceSavings = Math.round((avgBreachCost * insuranceDiscount) / 100 / 12)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-medium text-white">ROI Calculator</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Average Breach Cost ($)</label>
            <input
              type="number"
              className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              value={avgBreachCost}
              onChange={e => setAvgBreachCost(parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Insurance Discount (%)</label>
            <input
              type="number"
              className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              value={insuranceDiscount}
              onChange={e => setInsuranceDiscount(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-surface-card rounded-xl p-4 border border-white/5">
            <div className="text-white/50 text-sm">Org Avg Risk Score</div>
            <div className="text-2xl font-medium text-white">{Math.round(avgScore)}<span className="text-white/40 text-sm">/100</span></div>
          </div>
          <div className="bg-surface-card rounded-xl p-4 border border-white/5">
            <div className="text-white/50 text-sm">Breach Cost Avoided (est.)</div>
            <div className="text-2xl font-medium text-green-400">${breachCostAvoided.toLocaleString()}</div>
          </div>
          <div className="bg-surface-card rounded-xl p-4 border border-white/5">
            <div className="text-white/50 text-sm">Insurance Premium Saved / mo</div>
            <div className="text-2xl font-medium text-green-400">${insuranceSavings.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 9.05 Campaign management

**Migration:** `apps/api/src/db/migrations/012_campaigns.sql`

```sql
CREATE TABLE IF NOT EXISTS training_campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  puzzle_type VARCHAR(50),            -- null = all types
  difficulty  VARCHAR(20),            -- null = mixed
  dept_filter TEXT[],                 -- empty = all depts
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**File:** `apps/api/src/routes/campaigns.ts`

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth'
import { db } from '../db/client'

export const campaignsRouter = Router()
campaignsRouter.use(requireAuth, requireRole('ciso', 'admin'))

const CampaignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  puzzle_type: z.string().optional(),
  difficulty: z.string().optional(),
  dept_filter: z.array(z.string()).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

campaignsRouter.post('/', async (req, res) => {
  const parsed = CampaignSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', code: 'VALIDATION_ERROR', requestId: res.locals.requestId })
    return
  }
  const { orgId, userId } = res.locals.principal!
  const d = parsed.data

  const result = await db.query<{ id: string }>(
    `INSERT INTO training_campaigns (org_id, name, description, puzzle_type, difficulty, dept_filter, start_date, end_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [orgId, d.name, d.description ?? null, d.puzzle_type ?? null, d.difficulty ?? null, d.dept_filter ?? [], d.start_date, d.end_date, userId],
  )
  res.status(201).json({ id: result.rows[0]!.id })
})

campaignsRouter.get('/', async (_req, res) => {
  const { orgId } = res.locals.principal!
  const result = await db.query(
    `SELECT id, name, description, puzzle_type, difficulty, start_date, end_date FROM training_campaigns WHERE org_id = $1 ORDER BY start_date DESC`,
    [orgId],
  )
  res.json({ campaigns: result.rows })
})
```

**Commit:** `feat(api,dashboard): cohort analysis, behavioral change, ROI calc, campaign management (#9.01-9.05)`
