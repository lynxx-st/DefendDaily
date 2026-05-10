import { Router, type Request, type Response, type NextFunction, type Router as RouterType } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '../db/client'
import { logger } from '../config/logger'

export const usersRouter: RouterType = Router()

const emailSchema = z.string().email().max(255)

usersRouter.use((_req: Request, res: Response, next: NextFunction) => {
  res.locals.requestId = randomUUID()
  next()
})

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({
    error: message,
    code,
    requestId: res.locals.requestId ?? 'unknown',
  })
}

// Unauthenticated lookup: the dashboard calls this from the NextAuth session
// callback before a session exists. Returns id/org_id/role only — no email,
// display_name, or PII. Safe to expose on internal networks.
usersRouter.get('/by-email', async (req, res) => {
  const parsed = emailSchema.safeParse(req.query['email'])
  if (!parsed.success) {
    return sendError(res, 400, 'invalid_email', 'email query param required')
  }

  try {
    const { rows } = await db.query<{ id: string; org_id: string; role: string }>(
      `SELECT id, org_id, role FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [parsed.data]
    )
    if (rows.length === 0) {
      return sendError(res, 404, 'user_not_found', 'No DefendDaily user for that email')
    }
    res.json(rows[0])
  } catch (err) {
    logger.error({ err, requestId: res.locals.requestId }, 'users/by-email failed')
    sendError(res, 500, 'internal_error', 'Lookup failed')
  }
})
