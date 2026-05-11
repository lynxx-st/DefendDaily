import { Router, type Request, type Response, type NextFunction } from 'express'
import { randomBytes, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '../db/client'
import { env } from '../config/env'
import { requireAuth } from '../middleware/apiAuth'

export const familyRouter = Router()

const inviteBodySchema = z.object({
  role: z.enum(['senior', 'child']).default('senior'),
  email: z.string().email().optional(),
})

const acceptBodySchema = z.object({
  token: z.string().min(1),
})

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({
    error: message,
    code,
    requestId: res.locals.requestId ?? 'unknown',
  })
}

familyRouter.use((_req: Request, res: Response, next: NextFunction) => {
  res.locals.requestId = randomUUID()
  next()
})

familyRouter.post('/invite', requireAuth, async (req: Request, res: Response) => {
  const parsed = inviteBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'invalid_body', parsed.error.flatten().formErrors.join(', '))
  }

  const { role, email } = parsed.data
  const userId = res.locals.principal!.userId

  const token = randomBytes(32).toString('hex')

  await db.query(
    `INSERT INTO family_invites (inviter_id, token, email, role) VALUES ($1, $2, $3, $4)`,
    [userId, token, email ?? null, role],
  )

  const inviteUrl = `${env.CORS_ORIGIN}/sentrylife/join?token=${token}`
  res.json({ invite_url: inviteUrl, token, expires_in: '7 days' })
})

familyRouter.post('/accept', requireAuth, async (req: Request, res: Response) => {
  const parsed = acceptBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'invalid_body', 'token is required')
  }

  const { token } = parsed.data
  const newUserId = res.locals.principal!.userId

  const inviteResult = await db.query<{ id: string; inviter_id: string; role: string }>(
    `SELECT id, inviter_id, role FROM family_invites
     WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
    [token],
  )

  const invite = inviteResult.rows[0]
  if (!invite) {
    return sendError(res, 400, 'invalid_invite', 'Invalid or expired invite')
  }

  const inviterResult = await db.query<{ family_group_id: string | null }>(
    'SELECT family_group_id FROM users WHERE id = $1',
    [invite.inviter_id],
  )
  let familyGroupId = inviterResult.rows[0]?.family_group_id ?? null

  if (!familyGroupId) {
    const groupResult = await db.query<{ family_group_id: string }>(
      `UPDATE users SET family_group_id = gen_random_uuid() WHERE id = $1 RETURNING family_group_id`,
      [invite.inviter_id],
    )
    familyGroupId = groupResult.rows[0]!.family_group_id
  }

  await db.query(
    `UPDATE users SET family_group_id = $1, role = $2 WHERE id = $3`,
    [familyGroupId, invite.role, newUserId],
  )

  await db.query(
    'UPDATE family_invites SET accepted_at = NOW() WHERE id = $1',
    [invite.id],
  )

  res.json({ ok: true, family_group_id: familyGroupId })
})
