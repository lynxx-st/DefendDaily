import { Worker, type Job } from 'bullmq'
import { familyBreachQueue, connection } from './queue'
import { db } from '../db/client'
import { checkEmailBreaches } from '../services/hibp'
import { sendBreachMonitorEmail } from '../services/email'
import { logger } from '../config/logger'

export async function scheduleFamilyBreachJob(): Promise<void> {
  const existing = await familyBreachQueue.getRepeatableJobs()
  for (const job of existing) await familyBreachQueue.removeRepeatableByKey(job.key)

  await familyBreachQueue.add('family-breach-scan', {}, {
    repeat: { cron: '0 7 * * 1', tz: 'UTC' },
  })
  logger.info('Family breach monitor scheduled (Monday 07:00 UTC)')
}

type PrimaryUser = { id: string; email: string; family_group_id: string }
type FamilyMemberEmail = { email: string }

export const familyBreachWorker = new Worker(
  'family-breach-monitor',
  async (_job: Job) => {
    const primaries = await db.query<PrimaryUser>(`
      SELECT DISTINCT id, email, family_group_id
      FROM users
      WHERE family_group_id IS NOT NULL
        AND role = 'employee'
    `)

    logger.info({ primaryCount: primaries.rows.length }, 'Family breach monitor sweep starting')

    for (const primary of primaries.rows) {
      try {
        const familyResult = await db.query<FamilyMemberEmail>(
          `SELECT email FROM users
           WHERE family_group_id = $1
             AND email NOT LIKE '%@slack.local'`,
          [primary.family_group_id],
        )

        const breachSummary: { name: string; date: string; dataClasses: string[] }[] = []

        for (const member of familyResult.rows) {
          const breaches = await checkEmailBreaches(member.email)
          for (const breach of breaches) {
            breachSummary.push({
              name: breach.Name,
              date: breach.BreachDate,
              dataClasses: breach.DataClasses,
            })
          }
        }

        await sendBreachMonitorEmail(primary.email, breachSummary)
        logger.info(
          { userId: primary.id, familySize: familyResult.rows.length, breachCount: breachSummary.length },
          'Family breach monitor email sent',
        )
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        logger.error({ userId: primary.id, err: message }, 'Family breach monitor failed for user')
        await db.query(
          `INSERT INTO audit_log (user_id, action, metadata) VALUES ($1, 'job_failure', $2)`,
          [primary.id, JSON.stringify({ job: 'family-breach-monitor', error: message })],
        )
      }
    }
  },
  { connection, concurrency: 5, timeout: 30_000 },
)

familyBreachWorker.on('failed', async (job, err) => {
  await db.query(`INSERT INTO audit_log (action, metadata) VALUES ('job_failure', $1)`, [
    JSON.stringify({ job: job?.name, error: err.message }),
  ])
})
