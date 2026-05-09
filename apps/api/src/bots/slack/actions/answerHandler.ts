import type { ButtonAction } from '@slack/bolt'
import { slackApp } from '../app'
import { db } from '../../../db/client'
import { redis } from '../../../db/redis'
import { calcPoints } from '../../../services/puzzleEngine'

type DeliveryRow = {
  id: string
  status: string
  user_id: string
  delivered_at: string
  correct_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
  org_id: string
}

slackApp.action('puzzle_answer', async ({ action, ack, respond }) => {
  await ack()

  const btn = action as ButtonAction
  const { deliveryId, answer } = JSON.parse(btn.value) as { deliveryId: string; answer: string }

  const { rows } = await db.query<DeliveryRow>(`
    SELECT pd.id, pd.status, pd.user_id, pd.delivered_at,
           p.correct_answer, p.difficulty, p.explanation,
           o.id AS org_id
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
})
