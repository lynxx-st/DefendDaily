import { Worker, type Job } from 'bullmq'
import { riskScoreQueue, connection } from './queue'
import { db } from '../db/client'
import { computeRiskScore } from '../services/riskScorer'
import { logger } from '../config/logger'

export async function scheduleRiskScoreJob(): Promise<void> {
  const existing = await riskScoreQueue.getRepeatableJobs()
  for (const job of existing) await riskScoreQueue.removeRepeatableByKey(job.key)

  await riskScoreQueue.add('recalculate-scores', {}, {
    repeat: { cron: '0 2 * * *', tz: 'UTC' },
  })
  logger.info('Risk score job scheduled (02:00 UTC daily)')
}

export const riskScoreWorker = new Worker(
  'risk-score',
  async (_job: Job) => {
    const users = await db.query<{ id: string; risk_score: number }>(
      'SELECT id, risk_score FROM users'
    )

    for (const user of users.rows) {
      try {
        const { score } = await computeRiskScore(user.id)

        await db.query('UPDATE users SET risk_score = $1 WHERE id = $2', [score, user.id])

        await db.query(
          `INSERT INTO risk_score_history (user_id, score, recorded_at)
           VALUES ($1, $2, CURRENT_DATE)
           ON CONFLICT (user_id, recorded_at) DO UPDATE SET score = EXCLUDED.score`,
          [user.id, score]
        )
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        await db.query(
          `INSERT INTO audit_log (user_id, action, metadata) VALUES ($1, 'job_failure', $2)`,
          [user.id, JSON.stringify({ job: 'risk-score', error: message })]
        )
        logger.error({ userId: user.id, err }, 'Risk score recalculation failed for user')
      }
    }
  },
  { connection, concurrency: 5, timeout: 30_000 }
)

riskScoreWorker.on('failed', async (job, err) => {
  await db.query(`INSERT INTO audit_log (action, metadata) VALUES ('job_failure', $1)`, [
    JSON.stringify({ job: job?.name, error: err.message }),
  ])
})
