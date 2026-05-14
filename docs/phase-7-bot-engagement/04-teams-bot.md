# Steps 7.14–7.16 — Microsoft Teams Bot

## 7.14 Teams Adaptive Card puzzle delivery

**File:** `apps/api/src/bots/teams/cards/puzzleCard.ts`

```typescript
interface PuzzleOption { label: string; value: string }
interface PuzzlePayload { question: string; options: PuzzleOption[]; image_url?: string }

export function buildPuzzleAdaptiveCard(
  puzzle: { id: string; payload: PuzzlePayload; difficulty: string },
  deliveryId: string,
): Record<string, unknown> {
  const diffBadge = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[puzzle.difficulty] ?? puzzle.difficulty

  const body: unknown[] = [
    { type: 'TextBlock', text: 'DefendDaily — Daily Security Challenge', weight: 'Bolder', size: 'Medium', color: 'Accent' },
    { type: 'TextBlock', text: diffBadge, size: 'Small', isSubtle: true },
    { type: 'TextBlock', text: puzzle.payload.question, wrap: true, size: 'Medium', weight: 'Bolder', spacing: 'Medium' },
  ]
  if (puzzle.payload.image_url) {
    body.push({ type: 'Image', url: puzzle.payload.image_url, size: 'Large', horizontalAlignment: 'Center' })
  }

  const actions = puzzle.payload.options.map(opt => ({
    type: 'Action.Submit',
    title: opt.label,
    data: { action: 'puzzle_answer', deliveryId, answerId: opt.value },
  }))

  return {
    type: 'AdaptiveCard',
    version: '1.4',
    body,
    actions,
    fallbackText: `DefendDaily puzzle: ${puzzle.payload.question}`,
  }
}

export function buildAnswerFeedbackCard(isCorrect: boolean, explanation: string, pointsEarned: number): Record<string, unknown> {
  return {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      { type: 'TextBlock', text: isCorrect ? 'Correct!' : 'Incorrect', weight: 'Bolder', size: 'Large', color: isCorrect ? 'Good' : 'Attention' },
      { type: 'TextBlock', text: explanation, wrap: true, spacing: 'Medium' },
      { type: 'TextBlock', text: isCorrect ? `+${pointsEarned} points earned` : 'Keep practicing!', isSubtle: true, size: 'Small' },
    ],
    fallbackText: isCorrect ? `Correct! +${pointsEarned} points` : explanation,
  }
}
```

**File:** `apps/api/src/bots/teams/bot.ts`

```typescript
import { ActivityHandler, TurnContext } from 'botbuilder'
import { db } from '../../db/client'
import { logger } from '../../config/logger'
import { buildPuzzleAdaptiveCard, buildAnswerFeedbackCard } from './cards/puzzleCard'
import { scoreAnswer } from '../../services/puzzleEngine'

export class DefendDailyBot extends ActivityHandler {
  constructor() {
    super()
    this.onMessage(async (context, next) => {
      const activity = context.activity
      if (activity.value?.action === 'puzzle_answer') {
        await this.handlePuzzleAnswer(context)
      } else {
        const text = (activity.text ?? '').trim().toLowerCase()
        if (text.startsWith('/defend')) await this.handleDefend(context)
        else if (text.startsWith('/risk')) await this.handleRisk(context)
        else if (text.startsWith('/leaderboard')) await this.handleLeaderboard(context)
        else if (text.startsWith('/achievements')) await this.handleAchievements(context)
      }
      await next()
    })
  }

  private async handlePuzzleAnswer(context: TurnContext): Promise<void> {
    const { deliveryId, answerId } = context.activity.value as { deliveryId: string; answerId: string }
    const teamsUserId = context.activity.from.id

    const deliveryRow = await db.query<{ puzzle_id: string; status: string; user_id: string }>(
      `SELECT pd.puzzle_id, pd.status, pd.user_id FROM puzzle_deliveries pd
       JOIN users u ON u.id = pd.user_id
       WHERE pd.id = $1 AND u.provider_id = $2 AND u.provider_type = 'teams'`,
      [deliveryId, teamsUserId],
    )
    const delivery = deliveryRow.rows[0]
    if (!delivery || delivery.status !== 'pending') {
      await context.sendActivity('This puzzle has expired. Your next one arrives tomorrow!')
      return
    }

    const puzzleRow = await db.query<{ correct_answer: string; explanation: string; difficulty: string }>(
      `SELECT correct_answer, explanation, difficulty FROM puzzles WHERE id = $1`,
      [delivery.puzzle_id],
    )
    const puzzle = puzzleRow.rows[0]!
    const isCorrect = answerId === puzzle.correct_answer
    const { points, newStreak } = await scoreAnswer(delivery.user_id, deliveryId, isCorrect, puzzle.difficulty, 0)

    const card = buildAnswerFeedbackCard(isCorrect, puzzle.explanation, points)
    await context.sendActivity({
      attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }],
    })
    logger.info({ userId: delivery.user_id, isCorrect, points, streak: newStreak }, 'Teams puzzle answered')
  }

  private async handleDefend(context: TurnContext): Promise<void> {
    const userRow = await db.query<{ id: string }>(`SELECT id FROM users WHERE provider_id = $1 AND provider_type = 'teams'`, [context.activity.from.id])
    if (!userRow.rows[0]) { await context.sendActivity('Not registered. Ask your admin to set up DefendDaily.'); return }

    const puzzleRow = await db.query<{ id: string; payload: unknown; difficulty: string }>(
      `SELECT id, payload, difficulty FROM puzzles WHERE active = true ORDER BY random() LIMIT 1`,
    )
    const puzzle = puzzleRow.rows[0]
    if (!puzzle) { await context.sendActivity('No puzzles available right now.'); return }

    const deliveryRow = await db.query<{ id: string }>(
      `INSERT INTO puzzle_deliveries (user_id, puzzle_id, status) VALUES ($1, $2, 'pending') RETURNING id`,
      [userRow.rows[0].id, puzzle.id],
    )
    const deliveryId = deliveryRow.rows[0]!.id
    const card = buildPuzzleAdaptiveCard({ ...puzzle, payload: puzzle.payload as PuzzlePayload }, deliveryId)
    await context.sendActivity({ attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }] })
  }

  private async handleRisk(context: TurnContext): Promise<void> {
    const userRow = await db.query<{ risk_score: number; display_name: string }>(
      `SELECT risk_score, display_name FROM users WHERE provider_id = $1 AND provider_type = 'teams'`,
      [context.activity.from.id],
    )
    const user = userRow.rows[0]
    if (!user) { await context.sendActivity('No account found.'); return }
    const shield = user.risk_score >= 70 ? 'Green' : user.risk_score >= 40 ? 'Yellow' : 'Red'
    await context.sendActivity(`[${shield}] ${user.display_name ?? 'Your'} Risk Score: ${user.risk_score}/100`)
  }

  private async handleLeaderboard(context: TurnContext): Promise<void> {
    const orgRow = await db.query<{ org_id: string }>(`SELECT org_id FROM users WHERE provider_id = $1 AND provider_type = 'teams'`, [context.activity.from.id])
    if (!orgRow.rows[0]) return

    const top = await db.query<{ display_name: string; weekly_pts: string }>(
      `SELECT u.display_name, SUM(pd.points_earned)::text AS weekly_pts
       FROM puzzle_deliveries pd JOIN users u ON u.id = pd.user_id
       WHERE u.org_id = $1 AND pd.delivered_at >= date_trunc('week', CURRENT_DATE)
       GROUP BY u.id, u.display_name ORDER BY weekly_pts DESC LIMIT 10`,
      [orgRow.rows[0].org_id],
    )
    const lines = top.rows.map((r, i) => `${i + 1}. ${r.display_name} — ${r.weekly_pts} pts`)
    await context.sendActivity('**Weekly Leaderboard**\n\n' + lines.join('\n'))
  }

  private async handleAchievements(context: TurnContext): Promise<void> {
    const userRow = await db.query<{ id: string }>(`SELECT id FROM users WHERE provider_id = $1 AND provider_type = 'teams'`, [context.activity.from.id])
    if (!userRow.rows[0]) return

    const result = await db.query<{ name: string; icon_emoji: string; unlocked_at: string | null }>(
      `SELECT a.name, a.icon_emoji, ua.unlocked_at
       FROM achievements a LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
       ORDER BY ua.unlocked_at DESC NULLS LAST LIMIT 20`,
      [userRow.rows[0].id],
    )
    const earned = result.rows.filter(r => r.unlocked_at)
    const text = earned.length > 0 ? earned.map(a => `${a.icon_emoji} ${a.name}`).join('\n') : 'No achievements yet.'
    await context.sendActivity(`**Achievements (${earned.length}/${result.rowCount ?? 0})**\n\n${text}`)
  }
}
```

**File:** `apps/api/src/bots/teams/adapter.ts`

```typescript
import { BotFrameworkAdapter } from 'botbuilder'
import { env } from '../../config/env'
import { DefendDailyBot } from './bot'
import type { Request, Response } from 'express'
import { logger } from '../../config/logger'

export const teamsAdapter = new BotFrameworkAdapter({
  appId: env.TEAMS_APP_ID,
  appPassword: env.TEAMS_APP_PASSWORD,
})

teamsAdapter.onTurnError = async (context, error) => {
  logger.error({ err: error }, 'Teams adapter unhandled error')
  await context.sendActivity('Something went wrong. Please try again.')
}

const bot = new DefendDailyBot()

export function teamsMessageHandler(req: Request, res: Response): void {
  void teamsAdapter.processActivity(req, res, async (context) => {
    await bot.run(context)
  })
}
```

Register in `apps/api/src/index.ts`:
```typescript
import { teamsMessageHandler } from './bots/teams/adapter'
app.post('/api/teams/messages', teamsMessageHandler)
```

---

## 7.15 Teams commands

All Teams commands are handled via the `onMessage` dispatcher in `bot.ts` above (step 7.14). Teams uses conversational commands rather than slash commands — users type `/defend`, `/risk`, `/leaderboard`, or `/achievements` as a message.

---

## 7.16 Weekly personal DM digest

**File:** `apps/api/src/jobs/weeklyDigest.ts`

```typescript
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
  'Report suspicious emails even when not sure — it is always the right call.',
]

export const weeklyDigestWorker = new Worker(
  'weekly-digest',
  async () => {
    const users = await db.query<{
      provider_id: string; provider_type: string; display_name: string;
      risk_score: number; streak: number; weekly_pts: string; org_rank: string
    }>(
      `SELECT u.provider_id, u.provider_type, u.display_name, u.risk_score, u.streak,
              COALESCE(SUM(pd.points_earned), 0)::text AS weekly_pts,
              RANK() OVER (PARTITION BY u.org_id ORDER BY COALESCE(SUM(pd.points_earned), 0) DESC)::text AS org_rank
       FROM users u
       LEFT JOIN puzzle_deliveries pd ON pd.user_id = u.id AND pd.delivered_at >= date_trunc('week', CURRENT_DATE)
       GROUP BY u.id, u.org_id`,
    )

    const tip = TIPS[Math.floor(Math.random() * TIPS.length)]!

    for (const user of users.rows) {
      const shield = user.risk_score >= 70 ? '[Green]' : user.risk_score >= 40 ? '[Yellow]' : '[Red]'
      const text = `Your Weekly DefendDaily Digest\n\n${shield} Risk Score: ${user.risk_score}/100\nStreak: ${user.streak} days\nOrg Rank: #${user.org_rank}\n\nTip: ${tip}`

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
    logger.info({ count: users.rows.length }, 'Weekly digests sent')
  },
  { connection, concurrency: 2, timeout: 60_000 },
)

weeklyDigestWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, 'weekly-digest job failed')
})

await weeklyDigestQueue.add('weekly', {}, {
  repeat: { pattern: '0 8 * * MON' },
  removeOnComplete: { count: 10 },
  removeOnFail: { count: 20 },
})
```

**Commit:** `feat(api): Teams Adaptive Card bot, commands, weekly DM digest (#7.14-7.16)`
