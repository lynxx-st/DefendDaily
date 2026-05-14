import Stripe from 'stripe'
import { env } from '../config/env'
import { db } from '../db/client'
import { logger } from '../config/logger'

export const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder')

export async function createCheckoutSession(
  orgId: string,
  plan: 'growth' | 'enterprise',
  seatCount: number,
): Promise<string> {
  const { rows } = await db.query<{ stripe_customer_id: string | null; name: string }>(
    `SELECT stripe_customer_id, name FROM organizations WHERE id = $1`,
    [orgId],
  )
  const org = rows[0]
  if (!org) throw new Error('Organization not found')

  let customerId = org.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({ name: org.name, metadata: { orgId } })
    customerId = customer.id
    await db.query(`UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2`, [customerId, orgId])
  }

  const priceId = plan === 'growth' ? env.STRIPE_GROWTH_PRICE_ID : env.STRIPE_ENTERPRISE_PRICE_ID
  if (!priceId) throw new Error(`Price ID not configured for plan: ${plan}`)

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: seatCount }],
    success_url: `${env.NEXTAUTH_URL}/dashboard?billing=success`,
    cancel_url: `${env.NEXTAUTH_URL}/settings/billing?canceled=true`,
    metadata: { orgId, plan },
  })

  return session.url ?? ''
}

export async function handleWebhook(payload: Buffer, signature: string): Promise<void> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    logger.warn('STRIPE_WEBHOOK_SECRET not set — skipping webhook verification')
    return
  }

  const event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as { metadata?: Record<string, string>; subscription?: string | null }
      const { orgId, plan } = session.metadata ?? {}
      if (!orgId || !plan) return
      await db.query(
        `UPDATE organizations SET stripe_subscription_id = $1, plan = $2, plan_status = 'active' WHERE id = $3`,
        [session.subscription ?? null, plan, orgId],
      )
      logger.info({ orgId, plan }, 'Subscription activated')
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as { customer?: string | { id: string } | null }
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as { id?: string } | null)?.id
      if (!customerId) return
      await db.query(
        `UPDATE organizations SET plan_status = 'past_due' WHERE stripe_customer_id = $1`,
        [customerId],
      )
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as { id: string }
      await db.query(
        `UPDATE organizations SET plan = 'starter', plan_status = 'canceled', stripe_subscription_id = NULL WHERE stripe_subscription_id = $1`,
        [sub.id],
      )
      break
    }
  }
}
