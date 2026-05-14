import { App } from '@slack/bolt'
import { db } from '../../../db/client'

interface AchievementWithStatus {
  icon: string
  name: string
  description: string
  category: string
  earned_at: string | null
}

export function registerAchievementsCommand(app: App) {
  app.command('/achievements', async ({ command, ack, client }) => {
    await ack()

    const { rows: userRows } = await db.query<{ id: string }>(
      `SELECT id FROM users WHERE provider_id = $1 AND provider_type = 'slack'`,
      [command.user_id],
    )
    const user = userRows[0]

    if (!user) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: 'No DefendDaily account found. Answer your first daily puzzle to get started!',
      })
      return
    }

    const { rows } = await db.query<AchievementWithStatus>(`
      SELECT
        a.icon,
        a.name,
        a.description,
        a.category,
        ua.earned_at
      FROM achievements a
      LEFT JOIN user_achievements ua
        ON ua.achievement_id = a.id AND ua.user_id = $1
      ORDER BY a.category, a.name
    `, [user.id])

    const earned = rows.filter(r => r.earned_at !== null)
    const total = rows.length
    const byCategory = groupByCategory(rows)

    await client.chat.postMessage({
      channel: command.user_id,
      text: `You have earned ${earned.length} of ${total} achievements.`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blocks: buildAchievementsGrid(byCategory, earned.length, total) as any,
    })
  })
}

function groupByCategory(rows: AchievementWithStatus[]): Map<string, AchievementWithStatus[]> {
  const map = new Map<string, AchievementWithStatus[]>()
  for (const row of rows) {
    const bucket = map.get(row.category) ?? []
    bucket.push(row)
    map.set(row.category, bucket)
  }
  return map
}

const CATEGORY_LABEL: Record<string, string> = {
  streak: '🔥 Streaks',
  accuracy: '🎯 Accuracy',
  speed: '⚡ Speed',
  social: '👥 Social',
  milestone: '🏆 Milestones',
}

function buildAchievementsGrid(
  byCategory: Map<string, AchievementWithStatus[]>,
  earnedCount: number,
  total: number,
): Record<string, unknown>[] {
  const pct = Math.round((earnedCount / total) * 100)
  const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10))

  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🏅 Your Achievements', emoji: true },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${earnedCount} / ${total} earned* — ${pct}%\n\`${bar}\``,
      },
    },
    { type: 'divider' },
  ]

  for (const [category, achievements] of byCategory) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${CATEGORY_LABEL[category] ?? category}*`,
      },
    })

    for (const a of achievements) {
      const isEarned = a.earned_at !== null
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: isEarned
            ? `${a.icon} *${a.name}*\n${a.description}`
            : `⬜ _${a.name}_\n${a.description}`,
        },
      })
    }

    blocks.push({ type: 'divider' })
  }

  return blocks
}
