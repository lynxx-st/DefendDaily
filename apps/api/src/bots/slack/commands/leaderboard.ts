import { slackApp } from '../app'
import { redis } from '../../../db/redis'
import { db } from '../../../db/client'

slackApp.command('/leaderboard', async ({ command, ack, client }) => {
  await ack()

  const { rows: orgRows } = await db.query<{ id: string }>(
    'SELECT id FROM organizations WHERE slack_team_id = $1',
    [command.team_id],
  )
  if (!orgRows[0]) {
    await client.chat.postEphemeral({ channel: command.channel_id, user: command.user_id, text: 'Organization not found.' })
    return
  }
  const orgId = orgRows[0].id

  const { rows: top } = await db.query<{ user_id: string; display_name: string | null; weekly_pts: string }>(
    `SELECT u.id AS user_id, u.display_name, SUM(pd.points_earned)::text AS weekly_pts
     FROM puzzle_deliveries pd JOIN users u ON u.id = pd.user_id
     WHERE u.org_id = $1 AND pd.delivered_at >= date_trunc('week', CURRENT_DATE)
     GROUP BY u.id, u.display_name ORDER BY weekly_pts DESC LIMIT 10`,
    [orgId],
  )

  if (top.length === 0) {
    await client.chat.postEphemeral({ channel: command.channel_id, user: command.user_id, text: 'No scores yet this week. Be the first to answer a puzzle! 🛡️' })
    return
  }

  const prevRankKey = `leaderboard:prev:${orgId}`
  const prevRanks: Record<string, number> = JSON.parse((await redis.get(prevRankKey)) ?? '{}')

  const MEDALS = ['🥇', '🥈', '🥉']
  const lines = top.map((row, idx) => {
    const rank = idx + 1
    const prev = prevRanks[row.user_id]
    let arrow = ''
    if (prev !== undefined) {
      if (prev > rank) arrow = ` ↑${prev - rank}`
      else if (prev < rank) arrow = ` ↓${rank - prev}`
    }
    const medal = MEDALS[idx] ?? `${rank}.`
    return `${medal} *${row.display_name ?? 'Unknown'}*${arrow} — ${row.weekly_pts} pts`
  })

  const newRanks: Record<string, number> = {}
  top.forEach((row, idx) => { newRanks[row.user_id] = idx + 1 })
  await redis.set(prevRankKey, JSON.stringify(newRanks), 'EX', 86_400 * 7)

  await client.chat.postMessage({
    channel: command.user_id,
    text: '🏆 Top Defenders This Week',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '🏆 Top Defenders This Week', emoji: true } },
      { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: 'Scores reset every Monday. Keep answering to climb the ranks! _DefendDaily_' }],
      },
    ] as any,
  })
})
