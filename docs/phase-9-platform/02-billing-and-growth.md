# Steps 9.06–9.11 — Billing & Growth

## 9.07 Stripe billing integration

**Install:** `pnpm add stripe` in `apps/api`

**Migration:** `apps/api/src/db/migrations/013_billing.sql`

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_status VARCHAR(20) DEFAULT 'trialing'; -- trialing | active | past_due | canceled
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
```

**File:** `apps/api/src/services/stripe.ts`

```typescript
import Stripe from 'stripe'
import { env } from '../config/env'
import { db } from '../db/client'
import { logger } from '../config/logger'

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })

export async function createCheckoutSession(orgId: string, plan: 'growth' | 'enterprise', seatCount: number): Promise<string> {
  const orgRow = await db.query<{ stripe_customer_id: string | null; name: string }>(
    `SELECT stripe_customer_id, name FROM organizations WHERE id = $1`,
    [orgId],
  )
  const org = orgRow.rows[0]!

  let customerId = org.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({ name: org.name, metadata: { orgId } })
    customerId = customer.id
    await db.query(`UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2`, [customerId, orgId])
  }

  const priceId = plan === 'growth' ? env.STRIPE_GROWTH_PRICE_ID : env.STRIPE_ENTERPRISE_PRICE_ID

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: seatCount }],
    success_url: `${env.NEXTAUTH_URL}/dashboard?billing=success`,
    cancel_url: `${env.NEXTAUTH_URL}/dashboard/billing?canceled=true`,
    metadata: { orgId, plan },
  })

  return session.url!
}

export async function handleWebhook(payload: Buffer, signature: string): Promise<void> {
  const event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const { orgId, plan } = session.metadata ?? {}
      if (!orgId || !plan) return
      await db.query(
        `UPDATE organizations SET stripe_subscription_id = $1, plan = $2, plan_status = 'active' WHERE id = $3`,
        [session.subscription, plan, orgId],
      )
      logger.info({ orgId, plan }, 'Subscription activated')
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string
      await db.query(
        `UPDATE organizations SET plan_status = 'past_due' WHERE stripe_customer_id = $1`,
        [customerId],
      )
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await db.query(
        `UPDATE organizations SET plan = 'starter', plan_status = 'canceled', stripe_subscription_id = NULL WHERE stripe_subscription_id = $1`,
        [sub.id],
      )
      break
    }
  }
}
```

Register webhook in `apps/api/src/index.ts`:
```typescript
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    await handleWebhook(req.body as Buffer, req.headers['stripe-signature'] as string)
    res.json({ received: true })
  } catch (err) {
    res.status(400).json({ error: 'Webhook error', code: 'WEBHOOK_ERROR', requestId: res.locals.requestId })
  }
})
```

---

## 9.08 Seat-based metered billing

Stripe quantity updates when seat count changes. Schedule a nightly job to sync seat count:

**File:** `apps/api/src/jobs/seatSync.ts`

```typescript
import { Worker, Queue } from 'bullmq'
import { connection } from './queue'
import { db } from '../db/client'
import { stripe } from '../services/stripe'
import { logger } from '../config/logger'

export const seatSyncQueue = new Queue('seat-sync', { connection })

export const seatSyncWorker = new Worker(
  'seat-sync',
  async () => {
    const orgs = await db.query<{ id: string; stripe_subscription_id: string; seat_count: string }>(
      `SELECT o.id, o.stripe_subscription_id, COUNT(u.id)::text AS seat_count
       FROM organizations o
       JOIN users u ON u.org_id = o.id AND u.role = 'employee'
       WHERE o.stripe_subscription_id IS NOT NULL
       GROUP BY o.id`,
    )

    for (const org of orgs.rows) {
      try {
        const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id)
        const item = sub.items.data[0]
        if (!item) continue

        const currentQty = item.quantity ?? 0
        const newQty = parseInt(org.seat_count)
        if (currentQty !== newQty) {
          await stripe.subscriptionItems.update(item.id, { quantity: newQty })
          logger.info({ orgId: org.id, from: currentQty, to: newQty }, 'Seat count updated')
        }
      } catch (err) {
        logger.warn({ err, orgId: org.id }, 'Seat sync failed for org')
      }
    }
  },
  { connection, concurrency: 1, timeout: 60_000 },
)

await seatSyncQueue.add('nightly', {}, {
  repeat: { pattern: '0 2 * * *' },
  removeOnComplete: { count: 10 },
  removeOnFail: { count: 10 },
})
```

---

## 9.09 In-app upgrade flow

**File:** `apps/api/src/middleware/planGate.ts`

```typescript
import type { Request, Response, NextFunction } from 'express'
import { db } from '../db/client'

const PLAN_RANK: Record<string, number> = { starter: 1, growth: 2, enterprise: 3 }

export function requirePlan(minPlan: 'growth' | 'enterprise') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { orgId } = res.locals.principal!
    const orgRow = await db.query<{ plan: string; plan_status: string }>(
      `SELECT plan, plan_status FROM organizations WHERE id = $1`,
      [orgId],
    )
    const org = orgRow.rows[0]
    if (!org || org.plan_status === 'canceled') {
      res.status(402).json({ error: 'Subscription required', code: 'SUBSCRIPTION_REQUIRED', requestId: res.locals.requestId })
      return
    }
    if ((PLAN_RANK[org.plan] ?? 0) < (PLAN_RANK[minPlan] ?? 0)) {
      res.status(402).json({ error: `${minPlan} plan required`, code: 'PLAN_UPGRADE_REQUIRED', requestId: res.locals.requestId })
      return
    }
    next()
  }
}
```

Gate phishing simulation and compliance export routes with `requirePlan('growth')`. Gate Okta/Azure/SCIM with `requirePlan('enterprise')`.

---

## 9.10 Customer success portal

**File:** `apps/dashboard/src/app/(ciso)/success/page.tsx`

```typescript
import { requireSession } from '../../../lib/auth'
import { apiClient } from '../../../lib/apiClient'

export default async function SuccessPage() {
  const session = await requireSession(['ciso', 'admin'])
  const health = await apiClient('/api/analytics/health-score', session)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-medium text-white">Account Health</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScoreCard label="Adoption Rate" value={`${health.adoption_pct}%`} />
        <ScoreCard label="7d Active Users" value={health.active_7d} />
        <ScoreCard label="Avg Risk Score" value={`${health.avg_score}/100`} />
      </div>
      <div className="bg-surface-card rounded-xl p-5 border border-white/5">
        <h2 className="text-white/60 text-sm mb-3">Renewal Date</h2>
        <p className="text-white">{health.renewal_date ?? 'N/A'}</p>
      </div>
    </div>
  )
}

function ScoreCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-card rounded-xl p-5 border border-white/5">
      <div className="text-white/50 text-sm">{label}</div>
      <div className="text-2xl font-medium text-white mt-1">{value}</div>
    </div>
  )
}
```

---

## 9.11 Referral program

**Migration:** Add to `013_billing.sql`:

```sql
CREATE TABLE IF NOT EXISTS referrals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_org  UUID REFERENCES organizations(id),
  ref_code      VARCHAR(20) UNIQUE NOT NULL,
  referred_org  UUID REFERENCES organizations(id),
  commission_pct SMALLINT DEFAULT 20,
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

**File:** `apps/api/src/routes/referrals.ts`

```typescript
import { Router } from 'express'
import { randomBytes } from 'crypto'
import { requireAuth, requireRole } from '../middleware/auth'
import { db } from '../db/client'

export const referralsRouter = Router()
referralsRouter.use(requireAuth, requireRole('ciso', 'admin'))

referralsRouter.post('/generate', async (_req, res) => {
  const { orgId } = res.locals.principal!
  const code = randomBytes(6).toString('hex').toUpperCase()
  await db.query(
    `INSERT INTO referrals (referrer_org, ref_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [orgId, code],
  )
  res.json({ code, url: `${process.env['NEXTAUTH_URL']}/signup?ref=${code}` })
})

referralsRouter.get('/stats', async (_req, res) => {
  const { orgId } = res.locals.principal!
  const result = await db.query<{ ref_code: string; referred_count: string; paid_count: string }>(
    `SELECT ref_code,
       COUNT(referred_org)::text AS referred_count,
       COUNT(paid_at)::text AS paid_count
     FROM referrals WHERE referrer_org = $1 GROUP BY ref_code`,
    [orgId],
  )
  res.json({ referrals: result.rows })
})
```

**Commit:** `feat(api,dashboard): Stripe billing, seat sync, plan gates, success portal, referrals (#9.07-9.11)`
