import { slackApp } from '../app'
import { redis } from '../../../db/redis'
import { db } from '../../../db/client'

slackApp.command('/leaderboard', async ({ command, ack, respond }) => {
  await ack()

  const { rows: orgRows } = await db.query<{ id: string }>(
    'SELECT id FROM organizations WHERE slack_team_id = $1',
    [command.team_id]
  )
  if (!orgRows[0]) {
    await respond({ text: 'Organization not found.' })
    return
  }
  const orgId = orgRows[0].id

  // ZREVRANGE: highest score first, positions 0–9
  const raw = await redis.zrevrange(`leaderboard:${orgId}`, 0, 9, 'WITHSCORES')
  if (raw.length === 0) {
    await respond({ text: 'No scores yet this week. Be the first to answer a puzzle! 🛡️' })
    return
  }

  const entries: { userId: string; score: number }[] = []
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({ userId: raw[i]!, score: parseInt(raw[i + 1]!, 10) })
  }

  const { rows: userRows } = await db.query<{ provider_id: string; display_name: string | null }>(
    'SELECT provider_id, display_name FROM users WHERE provider_id = ANY($1::text[])',
    [entries.map(e => e.userId)]
  )
  const nameMap = new Map(userRows.map(u => [u.provider_id, u.display_name ?? 'Unknown Defender']))

  const MEDALS = ['🥇', '🥈', '🥉']
  const lines = entries.map((e, i) => {
    const medal = MEDALS[i] ?? `${i + 1}.`
    return `${medal} *${nameMap.get(e.userId) ?? 'Unknown Defender'}* — ${e.score} pts`
  })

  await respond({
    text: '🏆 Top Defenders This Week',
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '🏆 Top Defenders This Week' } },
      { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: 'Scores reset every Monday. Keep answering to climb the ranks! _DefendDaily_' }],
      },
    ],
    response_type: 'in_channel',
  })
})
