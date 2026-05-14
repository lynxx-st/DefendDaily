import { slackApp } from '../app'
import { db } from '../../../db/client'

slackApp.command('/admin-report', async ({ command, ack, client }) => {
  await ack()

  const { rows: orgRows } = await db.query<{ id: string; name: string }>(
    `SELECT o.id, o.name FROM organizations o
     JOIN users u ON u.org_id = o.id
     WHERE u.provider_id = $1 AND u.role IN ('ciso', 'admin')`,
    [command.user_id],
  )
  const org = orgRows[0]
  if (!org) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'Admin only.',
    })
    return
  }

  const { rows } = await db.query<{
    total_users: string
    active_7d: string
    avg_score: string
    puzzles_this_week: string
    correct_this_week: string
    at_risk: string
  }>(`
    SELECT
      COUNT(DISTINCT u.id)::text AS total_users,
      COUNT(DISTINCT CASE WHEN u.last_active_date >= CURRENT_DATE - 7 THEN u.id END)::text AS active_7d,
      ROUND(AVG(u.risk_score))::text AS avg_score,
      COUNT(CASE WHEN pd.delivered_at >= CURRENT_DATE - 7 THEN 1 END)::text AS puzzles_this_week,
      COUNT(CASE WHEN pd.delivered_at >= CURRENT_DATE - 7 AND pd.is_correct THEN 1 END)::text AS correct_this_week,
      COUNT(CASE WHEN u.risk_score < 40 THEN 1 END)::text AS at_risk
    FROM users u
    LEFT JOIN puzzle_deliveries pd ON pd.user_id = u.id
    WHERE u.org_id = $1
  `, [org.id])

  const s = rows[0]
  if (!s) return

  const accuracy = parseInt(s.puzzles_this_week, 10) > 0
    ? Math.round((parseInt(s.correct_this_week, 10) / parseInt(s.puzzles_this_week, 10)) * 100)
    : 0

  await client.chat.postMessage({
    channel: command.user_id,
    text: `${org.name} security report`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${org.name} — Security Report`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Total Users*\n${s.total_users}` },
          { type: 'mrkdwn', text: `*Active (7d)*\n${s.active_7d}` },
          { type: 'mrkdwn', text: `*Avg Risk Score*\n${s.avg_score ?? '—'}/100` },
          { type: 'mrkdwn', text: `*This Week Accuracy*\n${accuracy}%` },
          { type: 'mrkdwn', text: `*Puzzles Sent*\n${s.puzzles_this_week}` },
          { type: 'mrkdwn', text: `*At Risk (<40)*\n${s.at_risk} users` },
        ],
      },
    ] as any,
  })
})
