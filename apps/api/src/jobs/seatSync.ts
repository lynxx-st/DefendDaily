import { Worker, Queue } from 'bullmq'
import { connection } from './queue'
import { db } from '../db/client'
import { stripe } from '../services/stripe'
import { logger } from '../config/logger'
import { env } from '../config/env'

export const seatSyncQueue = new Queue('seat-sync', { connection })

export const seatSyncWorker = new Worker(
  'seat-sync',
  async () => {
    if (!env.STRIPE_SECRET_KEY) return

    const { rows: orgs } = await db.query<{
      id: string
      stripe_subscription_id: string
      seat_count: string
    }>(
      `SELECT o.id, o.stripe_subscription_id, COUNT(u.id)::text AS seat_count
       FROM organizations o
       JOIN users u ON u.org_id = o.id AND u.role = 'employee'
       WHERE o.stripe_subscription_id IS NOT NULL
       GROUP BY o.id`,
    )

    for (const org of orgs) {
      try {
        const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id)
        const item = sub.items.data[0]
        if (!item) continue

        const currentQty = item.quantity ?? 0
        const newQty = parseInt(org.seat_count, 10)
        if (currentQty !== newQty) {
          await stripe.subscriptionItems.update(item.id, { quantity: newQty })
          logger.info({ orgId: org.id, from: currentQty, to: newQty }, 'Seat count updated')
        }
      } catch (err) {
        logger.warn({ err, orgId: org.id }, 'Seat sync failed for org')
      }
    }
  },
  { connection, concurrency: 1 },
)

seatSyncWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, 'seat-sync job failed')
})

export async function scheduleSeatSyncJob() {
  await seatSyncQueue.add('nightly', {}, {
    repeat: { pattern: '0 2 * * *' },
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 10 },
  })
}
