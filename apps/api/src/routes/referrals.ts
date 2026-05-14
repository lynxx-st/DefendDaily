import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import { requireAuth, requireRole } from '../middleware/apiAuth'
import { db } from '../db/client'
import { env } from '../config/env'

export const referralsRouter = Router()
referralsRouter.use(requireAuth, requireRole(['ciso', 'admin']))

referralsRouter.post('/generate', async (_req, res) => {
  const orgId = res.locals['principal']?.orgId as string | undefined
  if (!orgId) { res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN', requestId: res.locals['requestId'] }); return }

  const code = randomBytes(6).toString('hex').toUpperCase()
  await db.query(
    `INSERT INTO referrals (referrer_org, ref_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [orgId, code],
  )
  res.json({ code, url: `${env.NEXTAUTH_URL}/signup?ref=${code}` })
})

referralsRouter.get('/stats', async (_req, res) => {
  const orgId = res.locals['principal']?.orgId as string | undefined
  if (!orgId) { res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN', requestId: res.locals['requestId'] }); return }

  const { rows } = await db.query<{ ref_code: string; referred_count: string; paid_count: string }>(
    `SELECT ref_code,
       COUNT(referred_org)::text AS referred_count,
       COUNT(paid_at)::text AS paid_count
     FROM referrals WHERE referrer_org = $1 GROUP BY ref_code`,
    [orgId],
  )
  res.json({ referrals: rows })
})
