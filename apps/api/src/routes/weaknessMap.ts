import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/apiAuth'
import { db } from '../db/client'

export const weaknessMapRouter = Router()
weaknessMapRouter.use(requireAuth, requireRole(['ciso', 'admin']))

weaknessMapRouter.get('/:orgId', async (req, res) => {
  const orgId = res.locals['principal']?.orgId as string | undefined
  if (!orgId) { res.status(403).json({ error: 'Forbidden' }); return }

  const { rows } = await db.query<{ tag: string; incorrect_count: string }>(`
    SELECT unnest(p.tags) AS tag, COUNT(*)::text AS incorrect_count
    FROM puzzle_deliveries pd
    JOIN puzzles p ON p.id = pd.puzzle_id
    JOIN users u ON u.id = pd.user_id
    WHERE u.org_id = $1 AND pd.is_correct = false
      AND pd.delivered_at >= CURRENT_DATE - 90
    GROUP BY tag
    ORDER BY incorrect_count DESC LIMIT 20
  `, [orgId])

  res.json({ weaknesses: rows })
})
