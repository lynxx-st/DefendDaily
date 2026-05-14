import { slackApp } from '../app'
import { db } from '../../../db/client'
import { getUserByProviderId } from '../../../services/userService'

interface AccuracyRow {
  accuracy_pct: string | null
  correct_count: string
  total_count: string
}

interface TypeBreakdownRow {
  type: string
  accuracy_pct: string | null
  attempts: string
}

interface RankRow {
  rank: string
}

slackApp.command('/stats', async ({ command, ack, client }) => {
  await ack()

  const user = await getUserByProviderId(command.user_id, 'slack')
  if (!user) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'No DefendDaily account found. Answer your first puzzle to get started!',
    })
    return
  }

  const [accuracyResult, typeResult, rankResult, streakResult] = await Promise.all([
    db.query<AccuracyRow>(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'correct')::float /
          NULLIF(COUNT(*) FILTER (WHERE status IN ('correct', 'incorrect')), 0) * 100 AS accuracy_pct,
        COUNT(*) FILTER (WHERE status = 'correct') AS correct_count,
        COUNT(*) AS total_count
      FROM puzzle_deliveries WHERE user_id = $1
    `, [user.id]),

    db.query<TypeBreakdownRow>(`
      SELECT p.type,
        COUNT(*) FILTER (WHERE pd.status = 'correct')::float /
          NULLIF(COUNT(*) FILTER (WHERE pd.status IN ('correct', 'incorrect')), 0) * 100 AS accuracy_pct,
        COUNT(*) FILTER (WHERE pd.status IN ('correct', 'incorrect')) AS attempts
      FROM puzzle_deliveries pd
      JOIN puzzles p ON p.id = pd.puzzle_id
      WHERE pd.user_id = $1
      GROUP BY p.type
    `, [user.id]),

    db.query<RankRow>(`
      SELECT COUNT(*) + 1 AS rank
      FROM users
      WHERE org_id = $1 AND risk_score > (SELECT risk_score FROM users WHERE id = $2)
    `, [user.org_id, user.id]),

    db.query<{ streak: number; longest_streak: number; risk_score: number }>(
      `SELECT streak, longest_streak, risk_score FROM users WHERE id = $1`,
      [user.id],
    ),
  ])

  const stats = accuracyResult.rows[0]
  const breakdown = typeResult.rows
  const rank = rankResult.rows[0]?.rank ?? '—'
  const profile = streakResult.rows[0]

  const breakdownLines = breakdown.map(row =>
    `• ${row.type.replace(/_/g, ' ')}: ${Math.round(parseFloat(row.accuracy_pct ?? '0'))}% (${row.attempts} attempts)`,
  )

  await client.chat.postMessage({
    channel: command.user_id,
    text: 'Your DefendDaily stats',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📊 Your Stats', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Overall Accuracy*\n${Math.round(parseFloat(stats?.accuracy_pct ?? '0'))}%` },
          { type: 'mrkdwn', text: `*Puzzles Completed*\n${stats?.total_count ?? 0}` },
          { type: 'mrkdwn', text: `*Current Streak*\n${profile?.streak ?? 0} days 🔥` },
          { type: 'mrkdwn', text: `*Longest Streak*\n${profile?.longest_streak ?? 0} days` },
          { type: 'mrkdwn', text: `*Risk Score*\n${profile?.risk_score ?? 75} / 100` },
          { type: 'mrkdwn', text: `*Org Rank*\n#${rank}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Accuracy by puzzle type:*\n${breakdownLines.join('\n') || '_No data yet._'}`,
        },
      },
    ] as any,
  })
})
