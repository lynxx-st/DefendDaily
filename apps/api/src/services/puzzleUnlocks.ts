import { redis } from '../db/redis'
import { logger } from '../config/logger'

const UNLOCK_THRESHOLDS = [
  { at: 30,  category: 'advanced_phishing', label: 'Advanced Phishing Techniques' },
  { at: 60,  category: 'supply_chain',      label: 'Supply Chain Attacks' },
  { at: 90,  category: 'physical_security', label: 'Physical Security' },
  { at: 150, category: 'deepfake_social',   label: 'Deepfake & AI Social Engineering' },
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
              text: `*🔓 New Category Unlocked!*\n\nYou have reached *${threshold.at}* correct answers!\n\nNew category: *${threshold.label}*\n\nThese puzzles will appear in your daily rotation.`,
            },
          },
        ],
      })
    } catch (err) {
      logger.warn({ err, userId }, 'Unlock notification failed')
    }
  }
}
