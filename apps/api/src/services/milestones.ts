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
    message: '*🎉 100 Puzzles!* You have completed 100 security challenges. You are officially a DefendDaily Veteran.',
  },
  {
    key: 'perfect_week',
    condition: (ctx: MilestoneContext) => ctx.perfectWeek,
    message: '*⭐ Perfect Week!* You answered every puzzle correctly this week. Incredible focus!',
  },
  {
    key: 'streak_30',
    condition: (ctx: MilestoneContext) => ctx.streak >= 30,
    message: '*🏆 30-Day Streak!* A full month of daily security practice. Your risk score thanks you.',
  },
  {
    key: 'streak_365',
    condition: (ctx: MilestoneContext) => ctx.streak >= 365,
    message: '*💎 365-Day Streak!* One full year. You are a true security champion.',
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
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: milestone.message } },
        ],
      })
    } catch (err) {
      logger.warn({ err, userId: ctx.userId, key: milestone.key }, 'Milestone DM failed')
    }
  }
}
