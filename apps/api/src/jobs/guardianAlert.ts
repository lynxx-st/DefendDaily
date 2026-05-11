import { Worker, type Job } from 'bullmq'
import { guardianAlertQueue, connection } from './queue'
import { db } from '../db/client'
import { slackApp } from '../bots/slack/app'
import { env } from '../config/env'
import { logger } from '../config/logger'

export async function scheduleGuardianAlertJob(): Promise<void> {
  const existing = await guardianAlertQueue.getRepeatableJobs()
  for (const job of existing) await guardianAlertQueue.removeRepeatableByKey(job.key)

  await guardianAlertQueue.add('check-family-scores', {}, {
    repeat: { cron: '0 3 * * *', tz: 'UTC' },
  })
  logger.info('Guardian Alert job scheduled (03:00 UTC daily)')
}

type FamilyMemberAlert = {
  member_id: string
  member_name: string | null
  member_score: number
  recent_incorrect: number
  inviter_id: string
  inviter_provider_id: string | null
  family_group_id: string
}

const ALERT_SQL = `
  WITH recent_misses AS (
    SELECT user_id, COUNT(*)::int AS incorrect_count
    FROM puzzle_deliveries
    WHERE is_correct = false
      AND delivered_at > NOW() - INTERVAL '3 days'
    GROUP BY user_id
  )
  SELECT
    m.id                    AS member_id,
    m.display_name          AS member_name,
    m.risk_score            AS member_score,
    m.family_group_id       AS family_group_id,
    COALESCE(rm.incorrect_count, 0) AS recent_incorrect,
    inviter.id              AS inviter_id,
    inviter.provider_id     AS inviter_provider_id
  FROM users m
  JOIN users inviter
    ON inviter.family_group_id = m.family_group_id
   AND inviter.role = 'employee'
  LEFT JOIN recent_misses rm ON rm.user_id = m.id
  WHERE m.role IN ('senior', 'child')
    AND m.family_group_id IS NOT NULL
    AND (m.risk_score < 50 OR COALESCE(rm.incorrect_count, 0) >= 3)
`

export const guardianAlertWorker = new Worker(
  'guardian-alert',
  async (_job: Job) => {
    const result = await db.query<FamilyMemberAlert>(ALERT_SQL)
    logger.info({ alertCount: result.rows.length }, 'Guardian Alert sweep starting')

    for (const member of result.rows) {
      if (!member.inviter_provider_id) {
        logger.warn(
          { inviterId: member.inviter_id, memberId: member.member_id },
          'Skipping guardian alert: inviter has no Slack provider_id',
        )
        continue
      }

      const lowScore = member.member_score < 50
      const reason = lowScore
        ? `Their Risk Score dropped to *${member.member_score}*`
        : `They missed *${member.recent_incorrect} puzzles* in the last 3 days`

      const memberLabel = member.member_name ?? 'A linked family member'

      try {
        await slackApp.client.chat.postMessage({
          token: env.SLACK_BOT_TOKEN,
          channel: member.inviter_provider_id,
          text: `Guardian Alert: ${memberLabel} needs attention`,
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: '🚨 Guardian Alert — Family member needs help' },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${memberLabel}* may need support. ${reason}.\n\nConsider reaching out to help them with their daily security challenges.`,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: 'View details on your SentryLife Family dashboard.',
                },
              ],
            },
          ],
        })

        await db.query(
          `INSERT INTO audit_log (user_id, action, metadata) VALUES ($1, 'guardian_alert_sent', $2)`,
          [
            member.inviter_id,
            JSON.stringify({
              memberId: member.member_id,
              score: member.member_score,
              recentIncorrect: member.recent_incorrect,
              trigger: lowScore ? 'low_score' : 'consecutive_misses',
            }),
          ],
        )
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        logger.error(
          { inviterId: member.inviter_id, memberId: member.member_id, err: message },
          'Guardian Alert send failed',
        )
        await db.query(
          `INSERT INTO audit_log (action, metadata) VALUES ('job_failure', $1)`,
          [JSON.stringify({ job: 'guardian-alert', memberId: member.member_id, error: message })],
        )
      }
    }
  },
  { connection, concurrency: 5 },
)

guardianAlertWorker.on('failed', async (job, err) => {
  await db.query(`INSERT INTO audit_log (action, metadata) VALUES ('job_failure', $1)`, [
    JSON.stringify({ job: job?.name, error: err.message }),
  ])
})
