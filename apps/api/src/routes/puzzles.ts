import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/client'
import { requireAuth, requireRole } from '../middleware/apiAuth'

export const puzzlesRouter = Router()

puzzlesRouter.use(requireAuth, requireRole(['ciso', 'admin']))

const CreatePuzzleSchema = z.object({
  type: z.enum(['spot_the_phish', 'true_false', 'scenario', 'breach_alert']),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  payload: z.object({
    question: z.string().min(10),
    options: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).min(2).max(4),
    image_url: z.string().url().optional(),
  }),
  correct_answer: z.string().min(1),
  explanation: z.string().min(20),
  tags: z.array(z.string()).default([]),
})

puzzlesRouter.post('/', async (req, res) => {
  const parsed = CreatePuzzleSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid puzzle data', code: 'VALIDATION_ERROR', requestId: res.locals['requestId'] })
    return
  }

  const { type, difficulty, payload, correct_answer, explanation, tags } = parsed.data
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO puzzles (type, difficulty, payload, correct_answer, explanation, tags, active)
     VALUES ($1, $2, $3, $4, $5, $6, false)
     RETURNING id`,
    [type, difficulty, JSON.stringify(payload), correct_answer, explanation, tags],
  )

  res.status(201).json({ id: rows[0]?.id })
})
