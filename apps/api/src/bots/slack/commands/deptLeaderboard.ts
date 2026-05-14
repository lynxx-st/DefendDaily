import { slackApp } from '../app'
import { db } from '../../../db/client'

slackApp.command('/dept-leaderboard', async ({ command, ack, client }) => {
  await ack()

  const { rows: orgRows } = await db.query<{ id: string }>(
    `SELECT id FROM organizations WHERE slack_team_id = $1`,
    [command.team_id],
  )
  const org = orgRows[0]
  if (!org) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'Organization not found.',
    })
    return
  }

  const { rows } = await db.query<{
    dept_key: string
    member_count: string
    total_points: string
  }>(`
    WITH weekly_scores AS (
      SELECT
        u.id AS user_id,
        split_part(u.email, '@', 2) AS dept_key,
        COALESCE(SUM(pd.points_earned), 0) AS user_points
      FROM users u
      LEFT JOIN puzzle_deliveries pd ON pd.user_id = u.id
        AND pd.responded_at >= NOW() - INTERVAL '7 days'
      WHERE u.org_id = $1
      GROUP BY u.id, u.email
    )
    SELECT
      dept_key,
      COUNT(*) AS member_count,
      SUM(user_points) AS total_points
    FROM weekly_scores
    GROUP BY dept_key
    ORDER BY total_points DESC
    LIMIT 10
  `, [org.id])

  const lines = rows.map((dept, i) =>
    `${i + 1}. *${dept.dept_key}* — ${dept.total_points} pts (${dept.member_count} members)`,
  )

  await client.chat.postMessage({
    channel: command.channel_id,
    text: 'Department Leaderboard (this week)',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🏢 Department Leaderboard — This Week', emoji: true },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: lines.join('\n') || '_No data yet._' },
      },
    ],
  })
})
