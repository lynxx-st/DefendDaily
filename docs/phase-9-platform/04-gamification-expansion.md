# Steps 9.17–9.21 — Gamification Expansion

## 9.17 Seasonal events (Security Awareness Month)

**File:** `apps/api/src/services/seasonalEvents.ts`

```typescript
import { db } from '../db/client'
import { logger } from '../config/logger'

interface SeasonalEvent {
  name: string
  startMonth: number
  endMonth: number
  pointsMultiplier: number
  announcementText: string
}

const EVENTS: SeasonalEvent[] = [
  {
    name: 'Security Awareness Month',
    startMonth: 10,
    endMonth: 10,
    pointsMultiplier: 2,
    announcementText: 'October is Security Awareness Month! All puzzles earn 2x points this month.',
  },
  {
    name: 'New Year Security Sprint',
    startMonth: 1,
    endMonth: 1,
    pointsMultiplier: 1.5,
    announcementText: 'New Year, new security habits! Earn 1.5x points throughout January.',
  },
]

export function getActiveEvent(date = new Date()): SeasonalEvent | null {
  const month = date.getMonth() + 1
  return EVENTS.find(e => month >= e.startMonth && month <= e.endMonth) ?? null
}

export function applySeasonalMultiplier(basePoints: number): number {
  const event = getActiveEvent()
  if (!event) return basePoints
  return Math.round(basePoints * event.pointsMultiplier)
}

export async function announceSeasonalEvent(): Promise<void> {
  const event = getActiveEvent()
  if (!event) return

  const orgs = await db.query<{ id: string }>(`SELECT id FROM organizations`)
  const { slackApp } = await import('../bots/slack/app')

  for (const org of orgs.rows) {
    const users = await db.query<{ provider_id: string }>(
      `SELECT provider_id FROM users WHERE org_id = $1 AND provider_type = 'slack' AND role = 'employee' LIMIT 1`,
      [org.id],
    )
    const channel = users.rows[0]?.provider_id
    if (!channel) continue

    try {
      await slackApp.client.chat.postMessage({
        channel,
        text: event.announcementText,
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: `*${event.name}*\n\n${event.announcementText}` } }],
      })
    } catch (err) {
      logger.warn({ err, orgId: org.id }, 'Seasonal event announcement failed')
    }
  }
}
```

---

## 9.18 Monthly Security Champion award

**File:** `apps/api/src/jobs/securityChampion.ts`

```typescript
import { Worker, Queue } from 'bullmq'
import { connection } from './queue'
import { db } from '../db/client'
import { logger } from '../config/logger'

export const championQueue = new Queue('security-champion', { connection })

export const championWorker = new Worker(
  'security-champion',
  async () => {
    // Find top user per org for the past month
    const result = await db.query<{
      org_id: string; user_id: string; display_name: string;
      provider_id: string; monthly_pts: string
    }>(
      `SELECT DISTINCT ON (u.org_id)
         u.org_id, u.id AS user_id, u.display_name, u.provider_id,
         SUM(pd.points_earned)::text AS monthly_pts
       FROM puzzle_deliveries pd
       JOIN users u ON u.id = pd.user_id
       WHERE pd.delivered_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
         AND pd.delivered_at < date_trunc('month', CURRENT_DATE)
         AND u.provider_type = 'slack'
       GROUP BY u.org_id, u.id, u.display_name, u.provider_id
       ORDER BY u.org_id, monthly_pts DESC`,
    )

    const { slackApp } = await import('../bots/slack/app')

    for (const champion of result.rows) {
      try {
        // Post to all employees in the org
        const employees = await db.query<{ provider_id: string }>(
          `SELECT provider_id FROM users WHERE org_id = $1 AND provider_type = 'slack' AND role = 'employee'`,
          [champion.org_id],
        )
        const month = new Date()
        month.setMonth(month.getMonth() - 1)
        const monthName = month.toLocaleString('en-US', { month: 'long' })

        for (const user of employees.rows) {
          await slackApp.client.chat.postMessage({
            channel: user.provider_id,
            text: `${monthName} Security Champion: ${champion.display_name}`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*${monthName} Security Champion*\n\nCongratulations to *${champion.display_name}* for earning ${champion.monthly_pts} points last month!\n\nThey are leading the charge in keeping our org secure.`,
                },
              },
            ],
          })
        }
        logger.info({ orgId: champion.org_id, champion: champion.display_name }, 'Security Champion announced')
      } catch (err) {
        logger.warn({ err, orgId: champion.org_id }, 'Champion announcement failed')
      }
    }
  },
  { connection, concurrency: 2, timeout: 120_000 },
)

championWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, 'security-champion job failed')
})

await championQueue.add('monthly', {}, {
  repeat: { pattern: '0 9 1 * *' }, // 1st of each month at 9 AM
  removeOnComplete: { count: 12 },
  removeOnFail: { count: 12 },
})
```

---

## 9.19 Anonymous industry benchmark

**File:** `apps/api/src/routes/benchmark.ts`

```typescript
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'

export const benchmarkRouter = Router()
benchmarkRouter.use(requireAuth)

benchmarkRouter.get('/', async (_req, res) => {
  const { orgId } = res.locals.principal!

  const [orgStats, industryStats] = await Promise.all([
    db.query<{ avg_score: string; avg_streak: string; accuracy: string }>(
      `SELECT
         ROUND(AVG(u.risk_score))::text AS avg_score,
         ROUND(AVG(u.streak))::text AS avg_streak,
         ROUND(COUNT(CASE WHEN pd.is_correct THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN pd.status != 'skipped' THEN 1 END), 0) * 100, 1)::text AS accuracy
       FROM users u
       LEFT JOIN puzzle_deliveries pd ON pd.user_id = u.id AND pd.delivered_at >= CURRENT_DATE - 30
       WHERE u.org_id = $1`,
      [orgId],
    ),
    db.query<{ avg_score: string; avg_streak: string; accuracy: string }>(
      // Anonymized: aggregate across all orgs, no org-level data exposed
      `SELECT
         ROUND(AVG(u.risk_score))::text AS avg_score,
         ROUND(AVG(u.streak))::text AS avg_streak,
         ROUND(COUNT(CASE WHEN pd.is_correct THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN pd.status != 'skipped' THEN 1 END), 0) * 100, 1)::text AS accuracy
       FROM users u
       LEFT JOIN puzzle_deliveries pd ON pd.user_id = u.id AND pd.delivered_at >= CURRENT_DATE - 30`,
    ),
  ])

  const org = orgStats.rows[0]!
  const industry = industryStats.rows[0]!

  const percentile = Math.round(
    ((parseFloat(org.avg_score) - parseFloat(industry.avg_score)) / (parseFloat(industry.avg_score) || 1)) * 50 + 50
  )

  res.json({
    org: { avg_score: parseInt(org.avg_score), avg_streak: parseInt(org.avg_streak), accuracy: parseFloat(org.accuracy) },
    industry: { avg_score: parseInt(industry.avg_score), avg_streak: parseInt(industry.avg_streak), accuracy: parseFloat(industry.accuracy) },
    percentile: Math.max(1, Math.min(99, percentile)),
  })
})
```

---

## 9.20 White-label customization

**Migration:** Add to `013_billing.sql`:

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS white_label_enabled BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_primary_color VARCHAR(7);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);
```

**File:** `apps/dashboard/src/app/api/theme/[orgId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: { orgId: string } }): Promise<NextResponse> {
  const { db } = await import('../../../../lib/db')
  const org = await db.query<{ brand_primary_color: string | null; brand_logo_url: string | null; white_label_enabled: boolean }>(
    `SELECT brand_primary_color, brand_logo_url, white_label_enabled FROM organizations WHERE id = $1`,
    [params.orgId],
  )
  const row = org.rows[0]
  if (!row?.white_label_enabled) {
    return new NextResponse('', { status: 204 })
  }

  const css = `
:root {
  --color-primary: ${row.brand_primary_color ?? '#0007cd'};
  --org-logo-url: url('${row.brand_logo_url ?? ''}');
}`.trim()

  return new NextResponse(css, { headers: { 'Content-Type': 'text/css', 'Cache-Control': 'public, max-age=300' } })
}
```

Load in root layout:
```typescript
// apps/dashboard/src/app/layout.tsx
// After session check, if org.white_label_enabled:
<link rel="stylesheet" href={`/api/theme/${org.id}`} />
```

---

## 9.21 SCIM 2.0 provisioning

**File:** `apps/api/src/routes/scim.ts`

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'

export const scimRouter = Router()
scimRouter.use(requireAuth)

const ScimUserSchema = z.object({
  userName: z.string().email(),
  displayName: z.string().optional(),
  active: z.boolean().optional(),
  name: z.object({ givenName: z.string().optional(), familyName: z.string().optional() }).optional(),
})

scimRouter.post('/Users', async (req, res) => {
  const parsed = ScimUserSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: 400, detail: 'Invalid user' }); return }

  const { orgId } = res.locals.principal!
  const { userName, displayName, active, name } = parsed.data
  const fullName = displayName ?? `${name?.givenName ?? ''} ${name?.familyName ?? ''}`.trim() || null

  const result = await db.query<{ id: string }>(
    `INSERT INTO users (org_id, email, display_name, provider_type, role)
     VALUES ($1, $2, $3, 'scim', 'employee')
     ON CONFLICT (org_id, email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id`,
    [orgId, userName, fullName],
  )
  const id = result.rows[0]!.id
  res.status(201).json({ schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'], id, userName, active: active ?? true })
})

scimRouter.put('/Users/:id', async (req, res) => {
  const parsed = ScimUserSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], status: 400, detail: 'Invalid user' }); return }

  const { orgId } = res.locals.principal!
  const { active } = parsed.data

  if (active === false) {
    await db.query(`UPDATE users SET last_active_date = NULL WHERE id = $1 AND org_id = $2`, [req.params['id'], orgId])
  }
  res.json({ schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'], id: req.params['id'], active: active ?? true })
})

scimRouter.delete('/Users/:id', async (req, res) => {
  const { orgId } = res.locals.principal!
  await db.query(`DELETE FROM users WHERE id = $1 AND org_id = $2`, [req.params['id'], orgId])
  res.status(204).send()
})
```

Mount at `/scim/v2`: `app.use('/scim/v2', requirePlan('enterprise'), scimRouter)`

**Commit:** `feat(api,dashboard): seasonal events, champion award, benchmark, white-label, SCIM (#9.17-9.21)`
