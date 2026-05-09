import { slackApp } from '../app'
import { db } from '../../../db/client'
import { redis } from '../../../db/redis'

const DEFENSE_POINTS = 150

slackApp.command('/report-phish', async ({ command, ack, respond }) => {
  await ack()

  const orgResult = await db.query<{ id: string }>(
    'SELECT id FROM organizations WHERE slack_team_id = $1',
    [command.team_id]
  )
  if (!orgResult.rows[0]) {
    await respond({ text: 'Organization not found.' })
    return
  }
  const orgId = orgResult.rows[0].id

  const userResult = await db.query<{ id: string }>(
    'SELECT id FROM users WHERE org_id = $1 AND provider_id = $2',
    [orgId, command.user_id]
  )
  if (!userResult.rows[0]) {
    await respond({ text: 'User not found.' })
    return
  }
  const userId = userResult.rows[0].id

  const campaignResult = await db.query<{ id: string; tracking_token: string; sender_id: string }>(
    `SELECT id, tracking_token, sender_id FROM phish_campaigns
     WHERE target_id = $1
       AND sent_at > NOW() - INTERVAL '7 days'
       AND reported_at IS NULL
       AND clicked_at IS NULL
     ORDER BY sent_at DESC
     LIMIT 1`,
    [userId]
  )

  const campaign = campaignResult.rows[0]

  if (!campaign) {
    await respond({
      text: '✅ Report received! No active simulation found. Reporting suspicious emails is always the right move.',
      response_type: 'ephemeral',
    })
    return
  }

  await db.query(
    `UPDATE phish_campaigns SET reported_at = NOW(), outcome = 'reported' WHERE id = $1`,
    [campaign.id]
  )

  await redis.zincrby(`leaderboard:${orgId}`, DEFENSE_POINTS, userId)

  await db.query(
    `INSERT INTO audit_log (org_id, user_id, action, metadata) VALUES ($1, $2, 'phish_reported', $3)`,
    [orgId, userId, JSON.stringify({ campaignId: campaign.id, points: DEFENSE_POINTS })]
  )

  await respond({
    text: `🛡️ You caught a phishing simulation! +${DEFENSE_POINTS} Defense Points awarded.`,
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🛡️ Phish Successfully Reported!' },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `You identified and reported a simulated phishing attempt before clicking.\n\n*+${DEFENSE_POINTS} Defense Points* added to your score! 🏆`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'In a real attack, reporting saves your entire organization. Great work!',
          },
        ],
      },
    ],
  })
})
