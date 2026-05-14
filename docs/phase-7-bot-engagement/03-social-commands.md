# Steps 7.08–7.12 — Social Commands

## 7.08 /challenge @user

**File:** `apps/api/src/bots/slack/commands/challenge.ts`

```typescript
import type { SlashCommand, Middleware } from '@slack/bolt'
import { randomUUID } from 'crypto'
import { redis } from '../../../db/redis'
import { db } from '../../../db/client'
import { buildPuzzleBlocks } from '../messages/puzzleBlock'

export const challengeCommand: Middleware<SlashCommand> = async ({ command, ack, client }) => {
  await ack()

  const targetSlackId = command.text.trim().replace(/^<@([A-Z0-9]+)\|.*>$/, '$1')
  if (!targetSlackId || targetSlackId === command.user_id) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'Usage: `/challenge @username`',
    })
    return
  }

  const [senderRow, receiverRow] = await Promise.all([
    db.query<{ id: string }>(`SELECT id FROM users WHERE provider_id = $1 AND provider_type = 'slack'`, [command.user_id]),
    db.query<{ id: string }>(`SELECT id FROM users WHERE provider_id = $1 AND provider_type = 'slack'`, [targetSlackId]),
  ])
  const senderId = senderRow.rows[0]?.id
  const receiverId = receiverRow.rows[0]?.id
  if (!senderId || !receiverId) {
    await client.chat.postEphemeral({ channel: command.channel_id, user: command.user_id, text: 'User not found in DefendDaily.' })
    return
  }

  const puzzleRow = await db.query<{ id: string; payload: Record<string, unknown>; correct_answer: string; difficulty: string }>(
    `SELECT id, payload, correct_answer, difficulty FROM puzzles WHERE active = true ORDER BY random() LIMIT 1`,
  )
  const puzzle = puzzleRow.rows[0]
  if (!puzzle) return

  const challengeId = randomUUID()
  await redis.hset(`challenge:${challengeId}`, {
    sender_id: senderId,
    receiver_id: receiverId,
    puzzle_id: puzzle.id,
    sender_slack_id: command.user_id,
    receiver_slack_id: targetSlackId,
    sender_answered: '0',
    receiver_answered: '0',
  })
  await redis.expire(`challenge:${challengeId}`, 3600)

  const blocks = buildPuzzleBlocks(puzzle.payload, `challenge:${challengeId}:sender`)

  await Promise.all([
    client.chat.postMessage({
      channel: command.user_id,
      text: `You challenged <@${targetSlackId}>! Here is your puzzle:`,
      blocks,
    }),
    client.chat.postMessage({
      channel: targetSlackId,
      text: `<@${command.user_id}> challenged you to a head-to-head puzzle! Respond quickly!`,
      blocks: buildPuzzleBlocks(puzzle.payload, `challenge:${challengeId}:receiver`),
    }),
  ])
}
```

Register: `slackApp.command('/challenge', challengeCommand)`

---

## 7.09 Smart 3 PM re-DM reminder

**File:** `apps/api/src/jobs/puzzleReminder.ts`

```typescript
import { Worker, Queue } from 'bullmq'
import { connection } from './queue'
import { db } from '../db/client'
import { logger } from '../config/logger'

export const reminderQueue = new Queue('puzzle-reminder', { connection })

export const reminderWorker = new Worker(
  'puzzle-reminder',
  async () => {
    const result = await db.query<{ provider_id: string }>(
      `SELECT u.provider_id
       FROM puzzle_deliveries pd
       JOIN users u ON u.id = pd.user_id
       JOIN organizations o ON o.id = u.org_id
       WHERE pd.status = 'pending'
         AND pd.delivered_at::date = CURRENT_DATE
         AND u.provider_type = 'slack'
         AND EXTRACT(HOUR FROM NOW() AT TIME ZONE o.timezone) = 15`,
    )

    if (result.rows.length === 0) return

    const { slackApp } = await import('../bots/slack/app')
    for (const row of result.rows) {
      try {
        await slackApp.client.chat.postMessage({
          channel: row.provider_id,
          text: "Reminder: You have not answered today's security puzzle yet! Your streak is on the line.",
        })
      } catch (err) {
        logger.warn({ err, providerId: row.provider_id }, 'Reminder DM failed')
      }
    }
    logger.info({ count: result.rows.length }, 'Sent puzzle reminders')
  },
  { connection, concurrency: 3, timeout: 30_000 },
)

reminderWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, 'puzzle-reminder job failed')
})

await reminderQueue.add('hourly-reminder', {}, {
  repeat: { pattern: '0 * * * *' },
  removeOnComplete: { count: 24 },
  removeOnFail: { count: 48 },
})
```

---

## 7.10 Bot welcome onboarding flow

**File:** `apps/api/src/services/onboarding.ts`

```typescript
import { db } from '../db/client'
import { logger } from '../config/logger'

const ONBOARDING_MESSAGES: Record<number, { text: string; blocks: unknown[] }> = {
  1: {
    text: 'Welcome to DefendDaily! You will get a security puzzle every morning.',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Welcome to DefendDaily!*\n\nEvery morning at 9 AM, I will send you a 60-second security challenge.\n\n- Answer correctly to build your streak\n- Earn points to climb the leaderboard\n- Type `/defend` any time to get a puzzle now\n- Type `/risk` to see your security score',
        },
      },
      {
        type: 'actions',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Get My First Puzzle Now' }, action_id: 'onboarding_first_puzzle', style: 'primary' },
        ],
      },
    ],
  },
  3: {
    text: 'Day 3 tip: Speed bonuses can 1.5x your points if you answer in under 30 seconds.',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Quick tip: Speed Bonuses!*\n\nAnswer within 30 seconds -> 1.5x points.\nAnswer within 60 seconds -> 1.2x points.\n\nYour streak is also multiplying your score. Keep it up!',
        },
      },
    ],
  },
  7: {
    text: 'One full week! You just earned a Streak Freeze token.',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*One Full Week — You are a Defender!*\n\nYou have earned a *Streak Freeze* token.\n\nType `/freeze` on any day you cannot answer to protect your streak.',
        },
      },
    ],
  },
}

export async function triggerOnboardingIfDue(userId: string, slackUserId: string): Promise<void> {
  const row = await db.query<{ created_at: Date }>(
    `SELECT created_at FROM users WHERE id = $1`,
    [userId],
  )
  const createdAt = row.rows[0]?.created_at
  if (!createdAt) return

  const daysSinceJoin = Math.floor((Date.now() - createdAt.getTime()) / 86_400_000)
  const dueDay = [1, 3, 7].find(d => d === daysSinceJoin + 1)
  if (!dueDay) return

  const message = ONBOARDING_MESSAGES[dueDay]
  if (!message) return

  const { slackApp } = await import('../bots/slack/app')
  try {
    await slackApp.client.chat.postMessage({
      channel: slackUserId,
      text: message.text,
      blocks: message.blocks as never,
    })
  } catch (err) {
    logger.warn({ err, slackUserId, dueDay }, 'Onboarding DM failed')
  }
}
```

Call `triggerOnboardingIfDue` from `dailyPuzzle.ts` worker after delivering each puzzle.

---

## 7.11 /admin-report command

**File:** `apps/api/src/bots/slack/commands/adminReport.ts`

```typescript
import type { SlashCommand, Middleware } from '@slack/bolt'
import { db } from '../../../db/client'

export const adminReportCommand: Middleware<SlashCommand> = async ({ command, ack, client }) => {
  await ack()

  const orgRow = await db.query<{ id: string; name: string }>(
    `SELECT o.id, o.name FROM organizations o
     JOIN users u ON u.org_id = o.id
     WHERE u.provider_id = $1 AND u.role IN ('ciso', 'admin')`,
    [command.user_id],
  )
  if (!orgRow.rows[0]) {
    await client.chat.postEphemeral({ channel: command.channel_id, user: command.user_id, text: 'Admin only.' })
    return
  }
  const { id: orgId, name: orgName } = orgRow.rows[0]

  const stats = await db.query<{
    total_users: string; active_7d: string; avg_score: string;
    puzzles_this_week: string; correct_this_week: string; at_risk: string
  }>(
    `SELECT
       COUNT(DISTINCT u.id)::text AS total_users,
       COUNT(DISTINCT CASE WHEN u.last_active_date >= CURRENT_DATE - 7 THEN u.id END)::text AS active_7d,
       ROUND(AVG(u.risk_score))::text AS avg_score,
       COUNT(CASE WHEN pd.delivered_at >= CURRENT_DATE - 7 THEN 1 END)::text AS puzzles_this_week,
       COUNT(CASE WHEN pd.delivered_at >= CURRENT_DATE - 7 AND pd.is_correct THEN 1 END)::text AS correct_this_week,
       COUNT(CASE WHEN u.risk_score < 40 THEN 1 END)::text AS at_risk
     FROM users u
     LEFT JOIN puzzle_deliveries pd ON pd.user_id = u.id
     WHERE u.org_id = $1`,
    [orgId],
  )
  const s = stats.rows[0]!
  const accuracy = s.puzzles_this_week !== '0'
    ? Math.round((parseInt(s.correct_this_week) / parseInt(s.puzzles_this_week)) * 100)
    : 0

  await client.chat.postMessage({
    channel: command.user_id,
    text: `${orgName} security report`,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `${orgName} Security Report` } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Total Users*\n${s.total_users}` },
          { type: 'mrkdwn', text: `*Active (7d)*\n${s.active_7d}` },
          { type: 'mrkdwn', text: `*Avg Risk Score*\n${s.avg_score}/100` },
          { type: 'mrkdwn', text: `*This Week Accuracy*\n${accuracy}%` },
          { type: 'mrkdwn', text: `*Puzzles Sent*\n${s.puzzles_this_week}` },
          { type: 'mrkdwn', text: `*At Risk (<40)*\n${s.at_risk} users` },
        ],
      },
    ],
  })
}
```

---

## 7.12 /send-now admin command

**File:** `apps/api/src/bots/slack/commands/sendNow.ts`

```typescript
import type { SlashCommand, Middleware } from '@slack/bolt'
import { db } from '../../../db/client'
import { puzzleQueue } from '../../../jobs/queue'

export const sendNowCommand: Middleware<SlashCommand> = async ({ command, ack, client }) => {
  await ack()

  const orgRow = await db.query<{ id: string }>(
    `SELECT o.id FROM organizations o
     JOIN users u ON u.org_id = o.id
     WHERE u.provider_id = $1 AND u.role IN ('ciso', 'admin')`,
    [command.user_id],
  )
  if (!orgRow.rows[0]) {
    await client.chat.postEphemeral({ channel: command.channel_id, user: command.user_id, text: 'Admin only.' })
    return
  }

  await puzzleQueue.add('manual-delivery', { orgId: orgRow.rows[0].id, force: true }, {
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 10 },
  })

  await client.chat.postEphemeral({
    channel: command.channel_id,
    user: command.user_id,
    text: 'Puzzle delivery triggered for your org. Messages will arrive shortly.',
  })
}
```

Register in `apps/api/src/bots/slack/app.ts`:
```typescript
slackApp.command('/challenge', challengeCommand)
slackApp.command('/admin-report', adminReportCommand)
slackApp.command('/send-now', sendNowCommand)
```

**Commit:** `feat(api): /challenge, smart reminder, onboarding flow, /admin-report, /send-now (#7.08-7.12)`
