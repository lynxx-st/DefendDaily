import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/apiAuth'
import { db } from '../db/client'

export const puzzleAnalyticsRouter = Router()

puzzleAnalyticsRouter.use(requireAuth, requireRole(['ciso', 'admin']))

puzzleAnalyticsRouter.get('/engagement', async (req, res) => {
  const orgId = res.locals['principal']?.orgId as string | undefined
  if (!orgId) { res.status(403).json({ error: 'Forbidden' }); return }

  const { rows } = await db.query<{
    puzzle_id: string
    type: string
    difficulty: string
    total_shown: string
    skip_rate: string
    avg_response_ms: string
    accuracy: string
  }>(`
    SELECT
      pd.puzzle_id,
      p.type,
      p.difficulty,
      COUNT(*)::text AS total_shown,
      ROUND(COUNT(CASE WHEN pd.status = 'skipped' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1)::text AS skip_rate,
      ROUND(AVG(pd.response_time_ms))::text AS avg_response_ms,
      ROUND(COUNT(CASE WHEN pd.is_correct THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN pd.status != 'skipped' THEN 1 END), 0) * 100, 1)::text AS accuracy
    FROM puzzle_deliveries pd
    JOIN puzzles p ON p.id = pd.puzzle_id
    JOIN users u ON u.id = pd.user_id
    WHERE u.org_id = $1 AND pd.delivered_at >= CURRENT_DATE - 30
    GROUP BY pd.puzzle_id, p.type, p.difficulty
    ORDER BY total_shown DESC
    LIMIT 50
  `, [orgId])

  res.json({ puzzles: rows })
})
