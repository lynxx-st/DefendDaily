import { Worker, Queue } from 'bullmq'
import { connection } from './queue'
import { db } from '../db/client'
import { logger } from '../config/logger'

export const reminderQueue = new Queue('puzzle-reminder', { connection })

export const reminderWorker = new Worker(
  'puzzle-reminder',
  async () => {
    const { rows } = await db.query<{ provider_id: string }>(
      `SELECT u.provider_id
       FROM puzzle_deliveries pd
       JOIN users u ON u.id = pd.user_id
       JOIN organizations o ON o.id = u.org_id
       WHERE pd.status = 'pending'
         AND pd.delivered_at::date = CURRENT_DATE
         AND u.provider_type = 'slack'
         AND EXTRACT(HOUR FROM NOW() AT TIME ZONE o.timezone) = 15`,
    )

    if (rows.length === 0) return

    const { slackApp } = await import('../bots/slack/app')
    for (const row of rows) {
      try {
        await slackApp.client.chat.postMessage({
          channel: row.provider_id,
          text: "Reminder: You haven't answered today's security puzzle yet! Your streak is on the line.",
        })
      } catch (err) {
        logger.warn({ err, providerId: row.provider_id }, 'reminder DM failed')
      }
    }
    logger.info({ count: rows.length }, 'puzzle reminders sent')
  },
  { connection, concurrency: 3 },
)

reminderWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, 'puzzle-reminder job failed')
})

export async function schedulePuzzleReminderJob() {
  await reminderQueue.add('hourly-reminder', {}, {
    repeat: { pattern: '0 * * * *' },
    removeOnComplete: { count: 24 },
    removeOnFail: { count: 48 },
  })
}
