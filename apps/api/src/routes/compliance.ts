import { Router, type Request, type Response, type NextFunction, type Router as RouterType } from 'express'
import { renderToBuffer } from '@react-pdf/renderer'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '../db/client'
import { logger } from '../config/logger'
import { buildCompliancePdf } from '../services/compliancePdf'
import { requireAuth, requireOrgMatch, requireRole } from '../middleware/apiAuth'

export const complianceRouter: RouterType = Router()

const orgIdSchema = z.string().uuid()

complianceRouter.use((_req: Request, res: Response, next: NextFunction) => {
  res.locals.requestId = randomUUID()
  next()
})

complianceRouter.use(requireAuth, requireRole(['ciso', 'admin']), requireOrgMatch('orgId'))

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({
    error: message,
    code,
    requestId: res.locals['requestId'] as string,
  })
}

complianceRouter.get('/:orgId/pdf', async (req, res) => {
  const orgIdResult = orgIdSchema.safeParse(req.params['orgId'])
  if (!orgIdResult.success) {
    return sendError(res, 400, 'invalid_org_id', 'orgId must be a valid UUID')
  }
  const orgId = orgIdResult.data

  try {
    const [orgResult, statsResult, phishResult] = await Promise.all([
      db.query<{ name: string; plan: string; created_at: Date }>(
        'SELECT name, plan, created_at FROM organizations WHERE id = $1',
        [orgId]
      ),
      db.query<{
        total_users: string
        avg_score: string | null
        total_interactions: string
        correct_answers: string
      }>(
        `SELECT
           COUNT(DISTINCT u.id)::bigint AS total_users,
           ROUND(AVG(u.risk_score))::int AS avg_score,
           COUNT(pd.id)::bigint AS total_interactions,
           COUNT(pd.id) FILTER (WHERE pd.is_correct = true)::bigint AS correct_answers
         FROM users u
         LEFT JOIN puzzle_deliveries pd ON u.id = pd.user_id
         WHERE u.org_id = $1`,
        [orgId]
      ),
      db.query<{ total_sent: string; total_clicked: string; total_reported: string }>(
        `SELECT
           COUNT(*)::bigint AS total_sent,
           COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::bigint AS total_clicked,
           COUNT(*) FILTER (WHERE reported_at IS NOT NULL)::bigint AS total_reported
         FROM phish_campaigns pc
         JOIN users u ON pc.target_id = u.id
         WHERE u.org_id = $1`,
        [orgId]
      ),
    ])

    const org = orgResult.rows[0]
    if (!org) {
      return sendError(res, 404, 'org_not_found', 'Organization not found')
    }
    const stats = statsResult.rows[0]
    const phish = phishResult.rows[0]

    const pdfBuffer = await renderToBuffer(
      buildCompliancePdf({
        orgName: org.name,
        plan: org.plan,
        reportingPeriod: `${new Date(org.created_at).toLocaleDateString()} – ${new Date().toLocaleDateString()}`,
        totalUsers: stats ? Number(stats.total_users) : 0,
        avgScore: stats?.avg_score != null ? Number(stats.avg_score) : 0,
        totalInteractions: stats ? Number(stats.total_interactions) : 0,
        correctAnswers: stats ? Number(stats.correct_answers) : 0,
        phishSent: phish ? Number(phish.total_sent) : 0,
        phishClicked: phish ? Number(phish.total_clicked) : 0,
        phishReported: phish ? Number(phish.total_reported) : 0,
        generatedAt: new Date().toISOString(),
      })
    )

    const safeName = org.name.replace(/[^a-zA-Z0-9_-]+/g, '_')
    res.set('Content-Type', 'application/pdf')
    res.set('Content-Disposition', `attachment; filename="${safeName}_compliance.pdf"`)
    res.set('Cache-Control', 'no-store')
    res.send(pdfBuffer)
  } catch (err) {
    logger.error({ err, orgId, requestId: res.locals['requestId'] }, 'compliance PDF failed')
    sendError(res, 500, 'internal_error', 'Failed to generate compliance PDF')
  }
})
