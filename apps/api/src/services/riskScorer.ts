import { db } from '../db/client'

export type RiskScoreComponents = {
  awareness: number
  consistency: number
  realWorldRisk: number
  score: number
}

export async function computeRiskScore(userId: string): Promise<RiskScoreComponents> {
  const deliveryResult = await db.query<{ total: string; correct: string }>(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE is_correct = true) AS correct
     FROM puzzle_deliveries
     WHERE user_id = $1
       AND status IN ('correct', 'incorrect')
       AND delivered_at >= NOW() - INTERVAL '30 days'`,
    [userId]
  )

  const row = deliveryResult.rows[0] ?? { total: '0', correct: '0' }
  const totalNum = parseInt(row.total, 10)
  const correctNum = parseInt(row.correct, 10)
  // Default to 75 for new users with no delivery history
  const awareness = totalNum === 0 ? 75 : Math.round((correctNum / totalNum) * 100)

  const userResult = await db.query<{ streak: number; breach_count: number }>(
    'SELECT streak, breach_count FROM users WHERE id = $1',
    [userId]
  )
  const user = userResult.rows[0]
  if (!user) throw new Error(`User ${userId} not found`)

  const consistency = Math.min(Math.round((user.streak / 30) * 100), 100)
  const realWorldRisk = Math.min(user.breach_count * 15, 100)

  const raw = awareness * 0.4 + consistency * 0.3 - realWorldRisk * 0.3
  const score = Math.max(0, Math.min(100, Math.round(raw)))

  return { awareness, consistency, realWorldRisk, score }
}

export function scoreToShield(score: number): string {
  if (score >= 80) return '🟢'
  if (score >= 60) return '🟡'
  if (score >= 40) return '🟠'
  return '🔴'
}

export function scoreToLabel(score: number): string {
  if (score >= 80) return 'Strong Defender'
  if (score >= 60) return 'Improving'
  if (score >= 40) return 'At Risk'
  return 'High Risk'
}
