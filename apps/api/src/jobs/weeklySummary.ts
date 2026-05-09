import { Worker, type Job } from 'bullmq'
import { weeklySummaryQueue, connection } from './queue'
import { db } from '../db/client'
import { computeRiskScore, scoreToShield, scoreToLabel } from '../services/riskScorer'
import { slackApp } from '../bots/slack/app'
import { logger } from '../config/logger'
import { env } from '../config/env'

const WEEKLY_TIPS = [
  "Never approve MFA push requests you didn't initiate.",
  'Use a password manager — never reuse passwords across sites.',
  'Lock your screen whenever you step away, even for a moment.',
  'Before clicking a link, hover to preview the actual URL.',
  'Report suspicious emails before deleting them — it helps protect everyone.',
  'Software updates often contain critical security patches. Never delay them.',
  'Public Wi-Fi is unsafe for work — always use your company VPN.',
  'Be suspicious of urgency: attackers create pressure to bypass your judgment.',
]

export async function scheduleWeeklySummaryJob(): Promise<void> {
  const existing = await weeklySummaryQueue.getRepeatableJobs()
  for (const job of existing) await weeklySummaryQueue.removeRepeatableByKey(job.key)

  await weeklySummaryQueue.add('weekly-summary', {}, {
    repeat: { cron: '0 8 * * 1', tz: 'UTC' },
  })
  logger.info('Weekly summary job scheduled (Monday 08:00 UTC)')
}

export const weeklySummaryWorker = new Worker(
  'weekly-summary',
  async (_job: Job) => {
    const users = await db.query<{ id: string; provider_id: string; streak: number }>(
      `SELECT u.id, u.provider_id, u.streak
       FROM users u
       JOIN organizations o ON u.org_id = o.id
       WHERE u.provider_type = 'slack' AND u.provider_id IS NOT NULL`
    )

    const tip = WEEKLY_TIPS[Math.floor(Math.random() * WEEKLY_TIPS.length)] ?? WEEKLY_TIPS[0]!

    for (const user of users.rows) {
      try {
        const { score } = await computeRiskScore(user.id)
        const shield = scoreToShield(score)
        const label = scoreToLabel(score)

        await slackApp.client.chat.postMessage({
          token: env.SLACK_BOT_TOKEN,
          channel: user.provider_id,
          text: `Weekly Security Summary — Risk Score: ${score}/100`,
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: '📊 Your Weekly Security Summary' },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Risk Score*\n${shield} ${score}/100 (${label})` },
                { type: 'mrkdwn', text: `*Current Streak*\n🔥 ${user.streak} days` },
              ],
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `💡 *Tip of the Week:*\n_${tip}_` },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: "Answer today's puzzle with `/defend` to keep your streak going!",
                },
              ],
            },
          ],
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        await db.query(
          `INSERT INTO audit_log (user_id, action, metadata) VALUES ($1, 'job_failure', $2)`,
          [user.id, JSON.stringify({ job: 'weekly-summary', error: message })]
        )
        logger.error({ userId: user.id, err }, 'Weekly summary failed for user')
      }
    }
  },
  { connection, concurrency: 5, timeout: 30_000 }
)
