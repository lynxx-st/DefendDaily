import { slackApp } from '../app'
import { db } from '../../../db/client'
import { computeRiskScore, scoreToShield, scoreToLabel } from '../../../services/riskScorer'

slackApp.command('/risk', async ({ command, ack, respond }) => {
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

  const userResult = await db.query<{ id: string; streak: number }>(
    'SELECT id, streak FROM users WHERE org_id = $1 AND provider_id = $2',
    [orgId, command.user_id]
  )
  if (!userResult.rows[0]) {
    await respond({ text: 'No data yet — answer your first daily puzzle to get a Risk Score!' })
    return
  }

  const user = userResult.rows[0]
  const { awareness, consistency, realWorldRisk, score } = await computeRiskScore(user.id)
  const shield = scoreToShield(score)
  const label = scoreToLabel(score)

  await respond({
    text: `${shield} Your Risk Score: ${score}/100`,
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${shield} Human Risk Score: ${score}/100 — ${label}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Awareness*\n${awareness}/100` },
          { type: 'mrkdwn', text: `*Consistency*\n${consistency}/100` },
          { type: 'mrkdwn', text: `*Breach Exposure*\n${realWorldRisk}/100` },
          { type: 'mrkdwn', text: `*Streak*\n${user.streak} days` },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text:
              score < 60
                ? "⚠️ Your score is below 60 — you're now receiving harder puzzles to sharpen your skills."
                : '✅ Keep answering daily puzzles to maintain your score.',
          },
        ],
      },
    ],
  })
})
