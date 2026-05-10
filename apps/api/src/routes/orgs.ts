import { Router, type Request, type Response, type NextFunction, type Router as RouterType } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type {
  LeaderboardEntry,
  OrgRiskSummary,
  PhishTrendPoint,
} from '@defenddaily/shared-types'
import { db } from '../db/client'
import { redis } from '../db/redis'
import { logger } from '../config/logger'
import { requireAuth, requireOrgMatch, requireRole } from '../middleware/apiAuth'

export const orgsRouter: RouterType = Router()

const orgIdSchema = z.string().uuid()
const weeksSchema = z.coerce.number().int().min(1).max(52).default(13)
const setupBodySchema = z.object({
  timezone: z.string().min(1).max(64),
  puzzle_time: z.string().regex(/^\d{2}:\d{2}$/, 'puzzle_time must be HH:MM'),
})

orgsRouter.use((_req: Request, res: Response, next: NextFunction) => {
  res.locals.requestId = randomUUID()
  next()
})

orgsRouter.use(requireAuth, requireRole(['ciso', 'admin']), requireOrgMatch('orgId'))

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({
    error: message,
    code,
    requestId: res.locals['requestId'] as string,
  })
}

function parseOrgId(req: Request, res: Response): string | null {
  const result = orgIdSchema.safeParse(req.params['orgId'])
  if (!result.success) {
    sendError(res, 400, 'invalid_org_id', 'orgId must be a valid UUID')
    return null
  }
  return result.data
}

orgsRouter.get('/:orgId/risk-summary', async (req, res) => {
  const orgId = parseOrgId(req, res)
  if (!orgId) return

  try {
    const { rows } = await db.query<{ total_users: string; avg_score: string | null }>(
      `SELECT COUNT(*)::bigint AS total_users, ROUND(AVG(risk_score))::int AS avg_score
       FROM users WHERE org_id = $1`,
      [orgId]
    )
    const row = rows[0]
    const summary: OrgRiskSummary = {
      org_id: orgId,
      total_users: row ? Number(row.total_users) : 0,
      avg_score: row?.avg_score != null ? Number(row.avg_score) : 0,
      departments: [],
    }
    res.json(summary)
  } catch (err) {
    logger.error({ err, orgId, requestId: res.locals['requestId'] }, 'risk-summary failed')
    sendError(res, 500, 'internal_error', 'Failed to compute risk summary')
  }
})

orgsRouter.get('/:orgId/phish-trend', async (req, res) => {
  const orgId = parseOrgId(req, res)
  if (!orgId) return

  const weeksResult = weeksSchema.safeParse(req.query['weeks'])
  if (!weeksResult.success) {
    return sendError(res, 400, 'invalid_weeks', 'weeks must be an integer between 1 and 52')
  }

  try {
    const { rows } = await db.query<{
      week_start: Date
      sent: string
      clicked: string
      reported: string
      click_rate: string | null
    }>(
      `SELECT
         DATE_TRUNC('week', sent_at) AS week_start,
         COUNT(*)::bigint AS sent,
         COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::bigint AS clicked,
         COUNT(*) FILTER (WHERE reported_at IS NOT NULL)::bigint AS reported,
         ROUND(
           COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::numeric
           / NULLIF(COUNT(*), 0) * 100, 1
         ) AS click_rate
       FROM phish_campaigns pc
       JOIN users u ON pc.target_id = u.id
       WHERE u.org_id = $1
         AND sent_at >= NOW() - (INTERVAL '1 week' * $2)
       GROUP BY week_start
       ORDER BY week_start`,
      [orgId, weeksResult.data]
    )
    const points: PhishTrendPoint[] = rows.map(r => ({
      week_start: r.week_start.toISOString(),
      sent: Number(r.sent),
      clicked: Number(r.clicked),
      reported: Number(r.reported),
      click_rate: r.click_rate != null ? Number(r.click_rate) : 0,
    }))
    res.json(points)
  } catch (err) {
    logger.error({ err, orgId, requestId: res.locals['requestId'] }, 'phish-trend failed')
    sendError(res, 500, 'internal_error', 'Failed to compute phish trend')
  }
})

orgsRouter.patch('/:orgId/setup', async (req, res) => {
  const orgId = parseOrgId(req, res)
  if (!orgId) return

  const body = setupBodySchema.safeParse(req.body)
  if (!body.success) {
    return sendError(res, 400, 'invalid_setup_body', body.error.issues[0]?.message ?? 'invalid body')
  }

  try {
    const result = await db.query(
      `UPDATE organizations
       SET timezone = $1, puzzle_time = $2::time
       WHERE id = $3
       RETURNING id`,
      [body.data.timezone, `${body.data.puzzle_time}:00`, orgId]
    )
    if (result.rowCount === 0) {
      return sendError(res, 404, 'org_not_found', 'Organization not found')
    }
    res.json({ ok: true })
  } catch (err) {
    logger.error({ err, orgId, requestId: res.locals['requestId'] }, 'org setup failed')
    sendError(res, 500, 'internal_error', 'Failed to update organization')
  }
})

orgsRouter.get('/:orgId/leaderboard', async (req, res) => {
  const orgId = parseOrgId(req, res)
  if (!orgId) return

  try {
    const raw = await redis.zrevrange(`leaderboard:${orgId}`, 0, 9, 'WITHSCORES')
    if (raw.length === 0) {
      res.json([])
      return
    }

    const entries: { providerId: string; score: number }[] = []
    for (let i = 0; i < raw.length; i += 2) {
      const providerId = raw[i]
      const score = raw[i + 1]
      if (providerId == null || score == null) continue
      entries.push({ providerId, score: parseInt(score, 10) })
    }

    const { rows: userRows } = await db.query<{ provider_id: string; display_name: string | null }>(
      `SELECT provider_id, display_name
       FROM users
       WHERE org_id = $1 AND provider_id = ANY($2::text[])`,
      [orgId, entries.map(e => e.providerId)]
    )
    const nameMap = new Map(userRows.map(u => [u.provider_id, u.display_name ?? 'Unknown']))

    const leaderboard: LeaderboardEntry[] = entries.map(e => ({
      user_id: e.providerId,
      display_name: nameMap.get(e.providerId) ?? 'Unknown',
      score: e.score,
    }))
    res.json(leaderboard)
  } catch (err) {
    logger.error({ err, orgId, requestId: res.locals['requestId'] }, 'leaderboard failed')
    sendError(res, 500, 'internal_error', 'Failed to load leaderboard')
  }
})
