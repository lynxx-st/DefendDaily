# Steps 7.17–7.22 — Advanced Engagement

## 7.17 Interactive leaderboard with rank-change arrows

Update `apps/api/src/bots/slack/commands/leaderboard.ts` to track and display rank deltas:

```typescript
import type { SlashCommand, Middleware } from '@slack/bolt'
import { db } from '../../../db/client'
import { redis } from '../../../db/redis'

export const leaderboardCommand: Middleware<SlashCommand> = async ({ command, ack, client }) => {
  await ack()

  const orgRow = await db.query<{ id: string }>(
    `SELECT o.id FROM organizations o JOIN users u ON u.org_id = o.id WHERE u.provider_id = $1`,
    [command.user_id],
  )
  if (!orgRow.rows[0]) return
  const orgId = orgRow.rows[0].id

  const top = await db.query<{ user_id: string; display_name: string; weekly_pts: string }>(
    `SELECT u.id AS user_id, u.display_name, SUM(pd.points_earned)::text AS weekly_pts
     FROM puzzle_deliveries pd JOIN users u ON u.id = pd.user_id
     WHERE u.org_id = $1 AND pd.delivered_at >= date_trunc('week', CURRENT_DATE)
     GROUP BY u.id, u.display_name ORDER BY weekly_pts DESC LIMIT 10`,
    [orgId],
  )

  const prevRankKey = `leaderboard:prev:${orgId}`
  const prevRanks: Record<string, number> = JSON.parse((await redis.get(prevRankKey)) ?? '{}')

  const lines = top.rows.map((row, idx) => {
    const rank = idx + 1
    const prev = prevRanks[row.user_id]
    let arrow = ''
    if (prev !== undefined) {
      if (prev > rank) arrow = ` up${prev - rank}`
      else if (prev < rank) arrow = ` down${rank - prev}`
      else arrow = ' same'
    }
    const medal = ['1st', '2nd', '3rd'][idx] ?? `${rank}.`
    return `${medal} *${row.display_name}*${arrow} — ${row.weekly_pts} pts`
  })

  const newRanks: Record<string, number> = {}
  top.rows.forEach((row, idx) => { newRanks[row.user_id] = idx + 1 })
  await redis.set(prevRankKey, JSON.stringify(newRanks), 'EX', 86_400 * 7)

  await client.chat.postMessage({
    channel: command.user_id,
    text: 'Weekly leaderboard',
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: 'Weekly Leaderboard' } },
      { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') || '_No activity this week_' } },
    ],
  })
}
```

---

## 7.18 Puzzle type unlocks

**File:** `apps/api/src/services/puzzleUnlocks.ts`

```typescript
import { redis } from '../db/redis'
import { logger } from '../config/logger'

const UNLOCK_THRESHOLDS = [
  { at: 30,  category: 'advanced_phishing',  label: 'Advanced Phishing Techniques' },
  { at: 60,  category: 'supply_chain',       label: 'Supply Chain Attacks' },
  { at: 90,  category: 'physical_security',  label: 'Physical Security' },
  { at: 150, category: 'deepfake_social',    label: 'Deepfake and AI Social Engineering' },
] as const

export async function checkPuzzleUnlocks(userId: string, slackUserId: string, totalCorrect: number): Promise<void> {
  const { slackApp } = await import('../bots/slack/app')

  for (const threshold of UNLOCK_THRESHOLDS) {
    if (totalCorrect < threshold.at) continue
    const flag = await redis.get(`unlock:${userId}:${threshold.category}`)
    if (flag) continue

    await redis.set(`unlock:${userId}:${threshold.category}`, '1', 'EX', 86_400 * 365)

    try {
      await slackApp.client.chat.postMessage({
        channel: slackUserId,
        text: `New puzzle category unlocked: ${threshold.label}!`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*New Category Unlocked!*\n\nYou have reached ${threshold.at} correct answers!\n\nNew category: *${threshold.label}*\n\nThese puzzles will appear in your daily rotation.`,
            },
          },
        ],
      })
    } catch (err) {
      logger.warn({ err, userId }, 'Unlock notification failed')
    }
  }
}
```

---

## 7.19 Milestone celebration DMs

**File:** `apps/api/src/services/milestones.ts`

```typescript
import { redis } from '../db/redis'
import { logger } from '../config/logger'

interface MilestoneContext {
  userId: string
  slackUserId: string
  totalAnswered: number
  perfectWeek: boolean
  streak: number
}

const MILESTONES = [
  {
    key: 'puzzles_100',
    condition: (ctx: MilestoneContext) => ctx.totalAnswered >= 100,
    message: '*100 Puzzles!* You have completed 100 security challenges. You are officially a DefendDaily Veteran.',
  },
  {
    key: 'perfect_week',
    condition: (ctx: MilestoneContext) => ctx.perfectWeek,
    message: '*Perfect Week!* You answered every puzzle correctly this week. Incredible focus!',
  },
  {
    key: 'streak_30',
    condition: (ctx: MilestoneContext) => ctx.streak >= 30,
    message: '*30-Day Streak!* A full month of daily security practice. Your risk score thanks you.',
  },
  {
    key: 'streak_365',
    condition: (ctx: MilestoneContext) => ctx.streak >= 365,
    message: '*365-Day Streak!* One full year. You are a true security champion.',
  },
]

export async function checkMilestones(ctx: MilestoneContext): Promise<void> {
  const { slackApp } = await import('../bots/slack/app')

  for (const milestone of MILESTONES) {
    if (!milestone.condition(ctx)) continue
    const flag = await redis.get(`milestone:${ctx.userId}:${milestone.key}`)
    if (flag) continue

    await redis.set(`milestone:${ctx.userId}:${milestone.key}`, '1', 'EX', 86_400 * 365 * 5)

    try {
      await slackApp.client.chat.postMessage({
        channel: ctx.slackUserId,
        text: milestone.message.replace(/\*/g, ''),
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: milestone.message } }],
      })
    } catch (err) {
      logger.warn({ err, userId: ctx.userId, milestone: milestone.key }, 'Milestone DM failed')
    }
  }
}
```

---

## 7.20 Slack status context triggers

**File:** `apps/api/src/services/statusContext.ts`

```typescript
import { db } from '../db/client'
import { logger } from '../config/logger'

const STATUS_TRIGGERS = [
  { keywords: ['ooo', 'out of office', 'traveling', 'travel', 'conference'], contextTag: 'travel' },
  { keywords: ['wfh', 'working from home', 'remote'],                        contextTag: 'remote' },
  { keywords: ['new hire', 'first week', 'just joined'],                     contextTag: 'new_hire' },
] as const

export async function getContextTagForUser(slackUserId: string, botToken: string): Promise<string | null> {
  try {
    const { WebClient } = await import('@slack/web-api')
    const web = new WebClient(botToken)
    const profile = await web.users.profile.get({ user: slackUserId })
    const statusText = (profile.profile?.status_text ?? '').toLowerCase()
    if (!statusText) return null

    for (const trigger of STATUS_TRIGGERS) {
      if (trigger.keywords.some(kw => statusText.includes(kw))) return trigger.contextTag
    }
  } catch (err) {
    logger.warn({ err, slackUserId }, 'Status context check failed')
  }
  return null
}

export async function selectContextAwarePuzzle(userId: string, contextTag: string | null): Promise<string | null> {
  if (!contextTag) return null
  const result = await db.query<{ id: string }>(
    `SELECT id FROM puzzles WHERE active = true AND context_trigger = $1 ORDER BY random() LIMIT 1`,
    [contextTag],
  )
  return result.rows[0]?.id ?? null
}
```

---

## 7.21 Multi-language routing framework

**Migration:** `apps/api/src/db/migrations/009_locale.sql`

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale VARCHAR(5) DEFAULT 'en';
ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}';
```

**File:** `apps/api/src/services/i18n.ts`

```typescript
import { db } from '../db/client'

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de'] as const
type Locale = typeof SUPPORTED_LOCALES[number]

function isSupported(locale: string): locale is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
}

export async function getLocalizedPuzzlePayload(
  puzzleId: string,
  userId: string,
): Promise<{ question: string; options: unknown[]; explanation: string; locale: Locale }> {
  const result = await db.query<{
    payload: { question: string; options: unknown[] }
    explanation: string
    translations: Record<string, { question: string; options: unknown[]; explanation: string }>
    user_locale: string
  }>(
    `SELECT p.payload, p.explanation, p.translations, u.locale AS user_locale
     FROM puzzles p JOIN users u ON u.id = $2 WHERE p.id = $1`,
    [puzzleId, userId],
  )
  const row = result.rows[0]!
  const locale = isSupported(row.user_locale) ? row.user_locale : 'en'

  if (locale !== 'en' && row.translations?.[locale]) {
    const t = row.translations[locale]!
    return { question: t.question, options: t.options, explanation: t.explanation, locale }
  }

  return { question: row.payload.question, options: row.payload.options, explanation: row.explanation, locale: 'en' }
}
```

---

## 7.22 Phase 7 integration tests

**File:** `apps/api/src/services/__tests__/achievements.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../db/client', () => ({ db: { query: vi.fn() } }))
vi.mock('../../db/redis', () => ({ redis: { get: vi.fn(), set: vi.fn(), incr: vi.fn(), expire: vi.fn() } }))
vi.mock('../../config/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { db } from '../../db/client'
import { checkAndFireAchievements } from '../achievements'

const mockDb = vi.mocked(db)

const baseCtx = {
  userId: 'user-1', orgId: 'org-1', slackUserId: 'U123', deliveryId: 'del-1',
  isCorrect: true, responseTimeMs: 5000, difficulty: 'medium', streak: 1,
  totalCorrect: 1, consecutiveCorrect: 1,
}

describe('checkAndFireAchievements', () => {
  beforeEach(() => vi.clearAllMocks())

  it('unlocks first_blood on first correct answer', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)
    mockDb.query.mockResolvedValueOnce({
      rows: [{ achievement: { id: 'ach-1', key: 'first_blood', name: 'First Blood', icon_emoji: '' } }],
    } as never)

    await checkAndFireAchievements(baseCtx)

    expect(mockDb.query).toHaveBeenCalledTimes(2)
    const unlockCall = mockDb.query.mock.calls[1]!
    expect(unlockCall[0]).toContain('INSERT INTO user_achievements')
    expect(unlockCall[1]).toContain('first_blood')
  })

  it('does not unlock first_blood if already earned', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ key: 'first_blood' }] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    await checkAndFireAchievements(baseCtx)

    const unlockCall = mockDb.query.mock.calls[1]!
    expect(unlockCall[1]).not.toContain('first_blood')
  })

  it('unlocks streak_7 when streak reaches 7', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ key: 'first_blood' }] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    await checkAndFireAchievements({ ...baseCtx, streak: 7 })

    const unlockCall = mockDb.query.mock.calls[1]!
    expect(unlockCall[1]).toContain('streak_7')
  })

  it('unlocks puzzle_100 at exactly 100 total correct', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    await checkAndFireAchievements({ ...baseCtx, totalCorrect: 100 })

    const unlockCall = mockDb.query.mock.calls[1]!
    expect(unlockCall[1]).toContain('puzzle_100')
  })

  it('unlocks speed_demon when response under 10s', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    await checkAndFireAchievements({ ...baseCtx, responseTimeMs: 9999 })

    const unlockCall = mockDb.query.mock.calls[1]!
    expect(unlockCall[1]).toContain('speed_demon')
  })

  it('does not unlock speed_demon when over 10s', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    await checkAndFireAchievements({ ...baseCtx, responseTimeMs: 10_001 })

    const unlockCall = mockDb.query.mock.calls[1]!
    expect((unlockCall[1] as string[]).includes('speed_demon')).toBe(false)
  })
})
```

**Commit:** `feat(api): interactive leaderboard, puzzle unlocks, milestones, status context, i18n, phase 7 tests (#7.17-7.22)`
