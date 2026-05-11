import { Router, type Request, type Response, type NextFunction, type Router as RouterType } from 'express'
import { randomBytes, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '../db/client'
import { logger } from '../config/logger'
import { env } from '../config/env'
import { requireAuth } from '../middleware/apiAuth'

export const familyRouter: RouterType = Router()

const inviteBodySchema = z.object({
  role: z.enum(['senior', 'child']).default('senior'),
  email: z.string().email().max(255).optional(),
})

const acceptBodySchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'token must be 64 hex chars'),
})

familyRouter.use((_req: Request, res: Response, next: NextFunction) => {
  res.locals.requestId = randomUUID()
  next()
})

familyRouter.use(requireAuth)

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({
    error: message,
    code,
    requestId: res.locals.requestId ?? 'unknown',
  })
}

familyRouter.post('/invite', async (req, res) => {
  const body = inviteBodySchema.safeParse(req.body)
  if (!body.success) {
    return sendError(res, 400, 'invalid_body', body.error.issues[0]?.message ?? 'invalid body')
  }
  const principal = res.locals.principal
  if (!principal) return sendError(res, 401, 'no_principal', 'auth required')

  try {
    const token = randomBytes(32).toString('hex')
    await db.query(
      `INSERT INTO family_invites (inviter_id, token, email, role)
       VALUES ($1, $2, $3, $4)`,
      [principal.userId, token, body.data.email ?? null, body.data.role]
    )

    res.status(201).json({
      invite_url: `${env.NEXTAUTH_URL}/sentrylife/join?token=${token}`,
      token,
      role: body.data.role,
      expires_in_days: 7,
    })
  } catch (err) {
    logger.error(
      { err, userId: principal.userId, requestId: res.locals.requestId },
      'family invite failed'
    )
    sendError(res, 500, 'internal_error', 'Failed to create invite')
  }
})

familyRouter.post('/accept', async (req, res) => {
  const body = acceptBodySchema.safeParse(req.body)
  if (!body.success) {
    return sendError(res, 400, 'invalid_body', body.error.issues[0]?.message ?? 'invalid body')
  }
  const principal = res.locals.principal
  if (!principal) return sendError(res, 401, 'no_principal', 'auth required')

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const inviteResult = await client.query<{
      id: string
      inviter_id: string
      role: 'senior' | 'child'
    }>(
      `SELECT id, inviter_id, role
       FROM family_invites
       WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [body.data.token]
    )
    const invite = inviteResult.rows[0]
    if (!invite) {
      await client.query('ROLLBACK')
      return sendError(res, 400, 'invalid_or_expired', 'Invite is invalid or expired')
    }
    if (invite.inviter_id === principal.userId) {
      await client.query('ROLLBACK')
      return sendError(res, 400, 'cannot_self_accept', 'Inviter cannot accept their own invite')
    }

    const inviterResult = await client.query<{ family_group_id: string | null }>(
      'SELECT family_group_id FROM users WHERE id = $1 FOR UPDATE',
      [invite.inviter_id]
    )
    let familyGroupId = inviterResult.rows[0]?.family_group_id ?? null

    if (!familyGroupId) {
      const group = await client.query<{ family_group_id: string }>(
        `UPDATE users SET family_group_id = gen_random_uuid()
         WHERE id = $1 RETURNING family_group_id`,
        [invite.inviter_id]
      )
      familyGroupId = group.rows[0]?.family_group_id ?? null
    }
    if (!familyGroupId) {
      await client.query('ROLLBACK')
      return sendError(res, 500, 'group_assign_failed', 'Could not assign family group')
    }

    await client.query(
      `UPDATE users SET family_group_id = $1, role = $2 WHERE id = $3`,
      [familyGroupId, invite.role, principal.userId]
    )
    await client.query(
      `UPDATE family_invites SET accepted_at = NOW(), accepted_by = $1 WHERE id = $2`,
      [principal.userId, invite.id]
    )

    await client.query('COMMIT')
    res.json({ ok: true, family_group_id: familyGroupId, role: invite.role })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined)
    logger.error(
      { err, userId: principal.userId, requestId: res.locals.requestId },
      'family accept failed'
    )
    sendError(res, 500, 'internal_error', 'Failed to accept invite')
  } finally {
    client.release()
  }
})
