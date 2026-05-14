import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/apiAuth'
import { db } from '../db/client'

export const cohortRouter = Router()
cohortRouter.use(requireAuth, requireRole(['ciso', 'admin']))

cohortRouter.get('/cohorts', async (_req, res) => {
  const orgId = res.locals['principal']?.orgId as string | undefined
  if (!orgId) { res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN', requestId: res.locals['requestId'] }); return }

  const { rows } = await db.query<{
    cohort: string
    user_count: string
    avg_score: string
    avg_streak: string
    accuracy: string
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
  res.json({ cohorts: rows })
})

const behavioralChangeParamsSchema = z.object({ userId: z.string().uuid() })

cohortRouter.get('/behavioral-change/:userId', async (req, res) => {
  const orgId = res.locals['principal']?.orgId as string | undefined
  if (!orgId) { res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN', requestId: res.locals['requestId'] }); return }

  const parsed = behavioralChangeParamsSchema.safeParse(req.params)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid userId', code: 'VALIDATION_ERROR', requestId: res.locals['requestId'] })
    return
  }
  const { userId } = parsed.data

  const { rows } = await db.query<{ period: string; avg_score: string; accuracy: string }>(
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

  const before = rows.find(r => r.period === 'before')
  const after = rows.find(r => r.period === 'after')
  const delta = before && after ? parseInt(after.avg_score, 10) - parseInt(before.avg_score, 10) : null

  res.json({ before, after, delta })
})

cohortRouter.get('/health-score', async (_req, res) => {
  const orgId = res.locals['principal']?.orgId as string | undefined
  if (!orgId) { res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN', requestId: res.locals['requestId'] }); return }

  const { rows } = await db.query<{
    total_users: string
    active_7d: string
    avg_score: string
    renewal_date: string | null
  }>(
    `SELECT
       COUNT(DISTINCT u.id)::text AS total_users,
       COUNT(DISTINCT CASE WHEN pd.delivered_at >= CURRENT_DATE - 7 THEN u.id END)::text AS active_7d,
       ROUND(AVG(u.risk_score))::text AS avg_score,
       TO_CHAR(o.plan_expires_at, 'YYYY-MM-DD') AS renewal_date
     FROM users u
     JOIN organizations o ON o.id = u.org_id
     LEFT JOIN puzzle_deliveries pd ON pd.user_id = u.id
     WHERE u.org_id = $1
     GROUP BY o.plan_expires_at`,
    [orgId],
  )
  const row = rows[0]
  const totalUsers = parseInt(row?.total_users ?? '0', 10)
  const active7d = parseInt(row?.active_7d ?? '0', 10)
  const adoptionPct = totalUsers > 0 ? Math.round((active7d / totalUsers) * 100) : 0

  res.json({
    adoption_pct: adoptionPct,
    active_7d: active7d,
    avg_score: parseInt(row?.avg_score ?? '0', 10),
    renewal_date: row?.renewal_date ?? null,
  })
})
