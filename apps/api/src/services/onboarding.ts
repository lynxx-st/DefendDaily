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
          text: '*Welcome to DefendDaily!* 🛡️\n\nEvery morning at 9 AM I\'ll send you a 60-second security challenge.\n\n• Answer correctly to build your streak\n• Earn points to climb the leaderboard\n• Type `/defend` any time to get a puzzle now\n• Type `/risk` to see your security score',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Get My First Puzzle Now' },
            action_id: 'onboarding_first_puzzle',
            style: 'primary',
          },
        ],
      },
    ],
  },
  3: {
    text: 'Day 3 tip: Speed bonuses can 1.5× your points if you answer in under 30 seconds.',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Quick tip: Speed Bonuses! ⚡*\n\nAnswer within 30 seconds → 1.5× points\nAnswer within 60 seconds → 1.2× points\n\nYour streak is also multiplying your score. Keep it up!',
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
          text: '*One Full Week — You\'re a Defender! 🔥*\n\nYou\'ve earned a *Streak Freeze* token 🧊\n\nType `/freeze` on any day you can\'t answer to protect your streak. Use it wisely — you can hold up to 3!',
        },
      },
    ],
  },
}

export async function triggerOnboardingIfDue(userId: string, slackUserId: string): Promise<void> {
  const { rows } = await db.query<{ created_at: Date }>(
    `SELECT created_at FROM users WHERE id = $1`,
    [userId],
  )
  const createdAt = rows[0]?.created_at
  if (!createdAt) return

  const daysSinceJoin = Math.floor((Date.now() - createdAt.getTime()) / 86_400_000)
  const dueDay = ([1, 3, 7] as const).find(d => d === daysSinceJoin + 1)
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
    logger.warn({ err, slackUserId, dueDay }, 'onboarding DM failed')
  }
}
