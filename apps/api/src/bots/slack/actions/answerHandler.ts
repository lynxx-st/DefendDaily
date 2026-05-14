import type { ButtonAction } from '@slack/bolt'
import { slackApp } from '../app'
import { db } from '../../../db/client'
import { redis } from '../../../db/redis'
import { calcPoints } from '../../../services/puzzleEngine'
import { checkAndGrantAchievements } from '../../../services/achievementEngine'
import { logger } from '../../../config/logger'

type DeliveryRow = {
  id: string
  status: string
  user_id: string
  delivered_at: string
  correct_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
  org_id: string
  puzzle_type: string
  org_timezone: string
}

slackApp.action('puzzle_answer', async ({ action, ack, respond, client }) => {
  await ack()

  const btn = action as ButtonAction
  const { deliveryId, answer } = JSON.parse(btn.value ?? '{}') as { deliveryId: string; answer: string }

  const { rows } = await db.query<DeliveryRow>(`
    SELECT pd.id, pd.status, pd.user_id, pd.delivered_at,
           p.correct_answer, p.difficulty, p.explanation, p.type AS puzzle_type,
           o.id AS org_id, o.timezone AS org_timezone
    FROM puzzle_deliveries pd
    JOIN puzzles p ON pd.puzzle_id = p.id
    JOIN users u ON pd.user_id = u.id
    JOIN organizations o ON u.org_id = o.id
    WHERE pd.id = $1
  `, [deliveryId])

  const delivery = rows[0]
  if (!delivery) {
    await respond({ text: 'Puzzle not found.', replace_original: false })
    return
  }

  const ageMs = Date.now() - new Date(delivery.delivered_at).getTime()
  if (ageMs > 86_400_000) {
    await respond({ text: '⏰ This puzzle has expired. Your next one arrives tomorrow!', replace_original: true })
    return
  }

  if (delivery.status !== 'pending') {
    await respond({ text: 'You already answered this one! 🛡️', replace_original: false })
    return
  }

  const isCorrect = answer === delivery.correct_answer
  const streakKey = `streak:${delivery.user_id}`
  const streak = parseInt((await redis.get(streakKey)) ?? '0', 10)
  const points = calcPoints(isCorrect, delivery.difficulty, ageMs, streak)
  const newStreak = isCorrect ? streak + 1 : 0

  await db.query(`
    UPDATE puzzle_deliveries
    SET status = $1, is_correct = $2, responded_at = NOW(), response_time_ms = $3, points_earned = $4
    WHERE id = $5
  `, [isCorrect ? 'correct' : 'incorrect', isCorrect, ageMs, points, deliveryId])

  await redis.set(streakKey, String(newStreak))

  if (isCorrect) {
    await redis.zadd(`leaderboard:${delivery.org_id}`, 'GT', points, delivery.user_id)
  }

  await db.query(
    'UPDATE users SET streak = $1, last_active_date = CURRENT_DATE WHERE id = $2',
    [newStreak, delivery.user_id]
  )

  const resultText = isCorrect
    ? `✅ *Correct!* You earned *${points} points*.\n\n💡 ${delivery.explanation}`
    : `❌ *Not quite.* The correct answer: *${delivery.correct_answer}*\n\n💡 ${delivery.explanation}`

  await respond({
    text: resultText,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: resultText } },
      ...(isCorrect ? [{
        type: 'context' as const,
        elements: [{ type: 'mrkdwn' as const, text: `🔥 Streak: ${newStreak} days | ⭐ +${points} pts` }],
      }] : []),
    ],
    replace_original: true,
  })

  // Achievement check — non-blocking, after respond so user gets instant feedback
  setImmediate(async () => {
    try {
      const [countResult, slackUserResult] = await Promise.all([
        db.query<{ total_correct: string; total_deliveries: string }>(`
          SELECT
            COUNT(*) FILTER (WHERE is_correct = true) AS total_correct,
            COUNT(*) AS total_deliveries
          FROM puzzle_deliveries
          WHERE user_id = $1
        `, [delivery.user_id]),
        db.query<{ provider_id: string }>(`
          SELECT provider_id FROM users WHERE id = $1
        `, [delivery.user_id]),
      ])

      const counts = countResult.rows[0]
      const slackUserId = slackUserResult.rows[0]?.provider_id
      if (!counts || !slackUserId) return

      const localHour = new Date().toLocaleString('en-US', {
        timeZone: delivery.org_timezone,
        hour: 'numeric',
        hour12: false,
      })

      const granted = await checkAndGrantAchievements({
        userId: delivery.user_id,
        orgId: delivery.org_id,
        isCorrect,
        responseTimeMs: ageMs,
        puzzleType: delivery.puzzle_type,
        streak: newStreak,
        totalCorrect: parseInt(counts.total_correct, 10),
        totalDeliveries: parseInt(counts.total_deliveries, 10),
        localHour: parseInt(localHour, 10),
      })

      for (const achievement of granted) {
        await client.chat.postMessage({
          channel: slackUserId,
          text: `${achievement.icon} Achievement unlocked: *${achievement.name}*`,
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: `${achievement.icon} Achievement Unlocked!`, emoji: true },
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*${achievement.name}*` },
            },
          ],
        })
      }
    } catch (err) {
      logger.error({ err, deliveryId }, 'achievement post-answer check failed')
    }
  })
})
