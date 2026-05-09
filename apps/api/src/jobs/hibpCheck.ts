import { Worker, type Job } from 'bullmq'
import { hibpQueue, connection } from './queue'
import { db } from '../db/client'
import { checkEmailBreaches } from '../services/hibp'
import { logger } from '../config/logger'

export async function scheduleHibpJob(): Promise<void> {
  const existing = await hibpQueue.getRepeatableJobs()
  for (const job of existing) await hibpQueue.removeRepeatableByKey(job.key)

  await hibpQueue.add(
    'scan-breaches',
    {},
    { repeat: { cron: '0 6 * * 1', tz: 'UTC' } }
  )
  logger.info('HIBP check job scheduled (Monday 06:00 UTC)')
}

export const hibpWorker = new Worker(
  'hibp-check',
  async (_job: Job) => {
    const users = await db.query<{ id: string; email: string; breach_count: number }>(
      `SELECT id, email, breach_count FROM users WHERE email NOT LIKE '%@slack.local'`
    )

    for (const user of users.rows) {
      try {
        const breaches = await checkEmailBreaches(user.email)

        for (const breach of breaches) {
          await db.query(
            `INSERT INTO breach_records (user_id, breach_name, breach_date, data_classes)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, breach_name) DO NOTHING`,
            [user.id, breach.Name, breach.BreachDate ?? null, breach.DataClasses]
          )
        }

        const countResult = await db.query<{ count: string }>(
          'SELECT COUNT(*) AS count FROM breach_records WHERE user_id = $1',
          [user.id]
        )
        const newCount = parseInt(countResult.rows[0]?.count ?? '0', 10)

        if (newCount !== user.breach_count) {
          await db.query(
            'UPDATE users SET breach_count = $1, hibp_last_checked = NOW() WHERE id = $2',
            [newCount, user.id]
          )
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        await db.query(
          `INSERT INTO audit_log (user_id, action, metadata) VALUES ($1, 'job_failure', $2)`,
          [user.id, JSON.stringify({ job: 'hibp-check', error: message })]
        )
        logger.error({ userId: user.id, err }, 'HIBP check failed for user')
      }
    }
  },
  // concurrency 1: HIBP enforces rate limits — serial processing is safer
  { connection, concurrency: 1, timeout: 30_000 }
)

hibpWorker.on('failed', async (job, err) => {
  await db.query(`INSERT INTO audit_log (action, metadata) VALUES ('job_failure', $1)`, [
    JSON.stringify({ job: job?.name, error: err.message }),
  ])
})
