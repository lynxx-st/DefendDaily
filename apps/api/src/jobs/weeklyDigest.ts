import { Worker, Queue } from 'bullmq'
import { connection } from './queue'
import { db } from '../db/client'
import { logger } from '../config/logger'

export const weeklyDigestQueue = new Queue('weekly-digest', { connection })

const TIPS = [
  'Always verify the sender domain, not just the display name.',
  'Enable hardware MFA on your most critical accounts.',
  'Hover over links to see the real destination before clicking.',
  'Use a password manager to generate unique credentials per site.',
  'Report suspicious emails even when unsure — it is always the right call.',
]

export const weeklyDigestWorker = new Worker(
  'weekly-digest',
  async () => {
    const { rows } = await db.query<{
      provider_id: string
      provider_type: string
      display_name: string | null
      risk_score: number
      streak: number
      weekly_pts: string
      org_rank: string
    }>(`
      SELECT u.provider_id, u.provider_type, u.display_name, u.risk_score, u.streak,
             COALESCE(SUM(pd.points_earned), 0)::text AS weekly_pts,
             RANK() OVER (PARTITION BY u.org_id ORDER BY COALESCE(SUM(pd.points_earned), 0) DESC)::text AS org_rank
      FROM users u
      LEFT JOIN puzzle_deliveries pd ON pd.user_id = u.id AND pd.delivered_at >= date_trunc('week', CURRENT_DATE)
      GROUP BY u.id, u.org_id
    `)

    const tip = TIPS[Math.floor(Math.random() * TIPS.length)]!

    for (const user of rows) {
      const shield = user.risk_score >= 70 ? '🟢' : user.risk_score >= 40 ? '🟡' : '🔴'
      const text = `${shield} *Your Weekly DefendDaily Digest*\n\nRisk Score: ${user.risk_score}/100\nStreak: ${user.streak} days 🔥\nThis Week Pts: ${user.weekly_pts}\nOrg Rank: #${user.org_rank}\n\n💡 _Tip: ${tip}_`

      try {
        if (user.provider_type === 'slack') {
          const { slackApp } = await import('../bots/slack/app')
          await slackApp.client.chat.postMessage({ channel: user.provider_id, text })
        } else if (user.provider_type === 'teams') {
          const { redis } = await import('../db/redis')
          const convRefJson = await redis.get(`teams:convref:${user.provider_id}`)
          if (convRefJson) {
            const { teamsAdapter } = await import('../bots/teams/adapter')
            const convRef = JSON.parse(convRefJson) as Record<string, unknown>
            await teamsAdapter.continueConversation(convRef as never, async (context) => {
              await context.sendActivity(text)
            })
          }
        }
      } catch (err) {
        logger.warn({ err, providerId: user.provider_id }, 'Weekly digest DM failed')
      }
    }
    logger.info({ count: rows.length }, 'Weekly digests sent')
  },
  { connection, concurrency: 2 },
)

weeklyDigestWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, 'weekly-digest job failed')
})

export async function scheduleWeeklyDigestJob() {
  await weeklyDigestQueue.add('weekly', {}, {
    repeat: { pattern: '0 8 * * MON' },
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 20 },
  })
}
