import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/apiAuth'
import { createCheckoutSession, handleWebhook } from '../services/stripe'
import { db } from '../db/client'

export const billingRouter = Router()

const CheckoutSchema = z.object({
  plan: z.enum(['growth', 'enterprise']),
  seat_count: z.coerce.number().int().min(1).max(10_000),
})

billingRouter.post('/checkout', requireAuth, requireRole(['ciso', 'admin']), async (req, res) => {
  const parsed = CheckoutSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', code: 'VALIDATION_ERROR', requestId: res.locals['requestId'] })
    return
  }

  const orgId = res.locals['principal']?.orgId as string | undefined
  if (!orgId) { res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN', requestId: res.locals['requestId'] }); return }

  const url = await createCheckoutSession(orgId, parsed.data.plan, parsed.data.seat_count)
  res.json({ url })
})

billingRouter.get('/status', requireAuth, requireRole(['ciso', 'admin']), async (_req, res) => {
  const orgId = res.locals['principal']?.orgId as string | undefined
  if (!orgId) { res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN', requestId: res.locals['requestId'] }); return }

  const { rows } = await db.query<{ plan: string; plan_status: string; plan_expires_at: string | null }>(
    `SELECT plan, plan_status, plan_expires_at FROM organizations WHERE id = $1`,
    [orgId],
  )
  res.json(rows[0] ?? { plan: 'starter', plan_status: 'trialing', plan_expires_at: null })
})

// Raw body webhook — mounted separately in index.ts with express.raw()
export async function stripeWebhookHandler(
  req: import('express').Request,
  res: import('express').Response,
) {
  try {
    await handleWebhook(req.body as Buffer, req.headers['stripe-signature'] as string)
    res.json({ received: true })
  } catch {
    res.status(400).json({ error: 'Webhook error', code: 'WEBHOOK_ERROR', requestId: res.locals['requestId'] })
  }
}
