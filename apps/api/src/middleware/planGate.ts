import type { Request, Response, NextFunction } from 'express'
import { db } from '../db/client'

const PLAN_RANK: Record<string, number> = { starter: 1, growth: 2, enterprise: 3 }

export function requirePlan(minPlan: 'growth' | 'enterprise') {
  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const orgId = res.locals['principal']?.orgId as string | undefined
    if (!orgId) {
      res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN', requestId: res.locals['requestId'] })
      return
    }

    const { rows } = await db.query<{ plan: string; plan_status: string }>(
      `SELECT plan, plan_status FROM organizations WHERE id = $1`,
      [orgId],
    )
    const org = rows[0]
    if (!org || org.plan_status === 'canceled') {
      res.status(402).json({ error: 'Subscription required', code: 'SUBSCRIPTION_REQUIRED', requestId: res.locals['requestId'] })
      return
    }
    if ((PLAN_RANK[org.plan] ?? 0) < (PLAN_RANK[minPlan] ?? 0)) {
      res.status(402).json({ error: `${minPlan} plan required`, code: 'PLAN_UPGRADE_REQUIRED', requestId: res.locals['requestId'] })
      return
    }
    next()
  }
}
