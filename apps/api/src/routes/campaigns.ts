import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/apiAuth'
import { db } from '../db/client'

export const campaignsRouter = Router()
campaignsRouter.use(requireAuth, requireRole(['ciso', 'admin']))

const CampaignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  puzzle_type: z.enum(['spot_the_phish', 'true_false', 'scenario', 'breach_alert']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  dept_filter: z.array(z.string()).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

campaignsRouter.post('/', async (req, res) => {
  const parsed = CampaignSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', code: 'VALIDATION_ERROR', requestId: res.locals['requestId'] })
    return
  }
  const principal = res.locals['principal'] as { orgId: string; userId: string } | undefined
  if (!principal) { res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN', requestId: res.locals['requestId'] }); return }

  const d = parsed.data
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO training_campaigns (org_id, name, description, puzzle_type, difficulty, dept_filter, start_date, end_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [principal.orgId, d.name, d.description ?? null, d.puzzle_type ?? null, d.difficulty ?? null, d.dept_filter ?? [], d.start_date, d.end_date, principal.userId],
  )
  res.status(201).json({ id: rows[0]?.id })
})

campaignsRouter.get('/', async (_req, res) => {
  const orgId = res.locals['principal']?.orgId as string | undefined
  if (!orgId) { res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN', requestId: res.locals['requestId'] }); return }

  const { rows } = await db.query(
    `SELECT id, name, description, puzzle_type, difficulty, dept_filter, start_date, end_date, created_at
     FROM training_campaigns WHERE org_id = $1 ORDER BY start_date DESC`,
    [orgId],
  )
  res.json({ campaigns: rows })
})

campaignsRouter.delete('/:id', async (req, res) => {
  const orgId = res.locals['principal']?.orgId as string | undefined
  if (!orgId) { res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN', requestId: res.locals['requestId'] }); return }

  const idParsed = z.string().uuid().safeParse(req.params['id'])
  if (!idParsed.success) { res.status(400).json({ error: 'Invalid id', code: 'VALIDATION_ERROR', requestId: res.locals['requestId'] }); return }

  await db.query(`DELETE FROM training_campaigns WHERE id = $1 AND org_id = $2`, [idParsed.data, orgId])
  res.status(204).end()
})
