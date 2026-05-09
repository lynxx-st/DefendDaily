import { db } from '../db/client'
import type { PuzzleRow } from '../bots/slack/messages/puzzleMessage'

export async function selectPuzzle(userId: string, _orgId: string): Promise<PuzzleRow | null> {
  const userResult = await db.query<{ risk_score: number }>(
    'SELECT risk_score FROM users WHERE id = $1',
    [userId]
  )
  const riskScore = userResult.rows[0]?.risk_score ?? 75

  // Users with score < 60 get harder puzzles to accelerate improvement
  const difficultyClause = riskScore < 60 ? `AND difficulty IN ('medium', 'hard')` : ''

  const { rows } = await db.query<PuzzleRow>(
    `SELECT id, type, difficulty, payload, correct_answer, explanation
     FROM puzzles
     WHERE active = true
       ${difficultyClause}
       AND id NOT IN (
         SELECT puzzle_id FROM puzzle_deliveries
         WHERE user_id = $1 AND puzzle_id IS NOT NULL
       )
     ORDER BY RANDOM()
     LIMIT 1`,
    [userId]
  )

  // Fallback: if no unseen puzzles match the filter, pick any unseen puzzle
  if (!rows[0] && difficultyClause) {
    const fallback = await db.query<PuzzleRow>(
      `SELECT id, type, difficulty, payload, correct_answer, explanation
       FROM puzzles
       WHERE active = true
         AND id NOT IN (
           SELECT puzzle_id FROM puzzle_deliveries
           WHERE user_id = $1 AND puzzle_id IS NOT NULL
         )
       ORDER BY RANDOM()
       LIMIT 1`,
      [userId]
    )
    return fallback.rows[0] ?? null
  }

  return rows[0] ?? null
}

export function calcPoints(
  isCorrect: boolean,
  difficulty: 'easy' | 'medium' | 'hard',
  responseTimeMs: number,
  streakDays: number
): number {
  if (!isCorrect) return 0
  const diffMult: Record<PuzzleRow['difficulty'], number> = { easy: 1.0, medium: 1.5, hard: 2.0 }
  const speedBonus = responseTimeMs < 30_000 ? 1.5 : responseTimeMs < 60_000 ? 1.2 : 1.0
  const streakMult = Math.min(1 + streakDays * 0.02, 1.5)
  return Math.round(100 * diffMult[difficulty] * speedBonus * streakMult)
}
