import { db } from '../db/client'
import type { PuzzleRow } from '../bots/slack/messages/puzzleMessage'

export async function selectPuzzle(userId: string, orgId: string): Promise<PuzzleRow | null> {
  // Check for an active campaign with assigned puzzles
  const { rows: campaignRows } = await db.query<{ puzzle_id: string }>(
    `SELECT cp.puzzle_id
     FROM campaign_puzzles cp
     JOIN training_campaigns tc ON tc.id = cp.campaign_id
     WHERE tc.org_id = $1
       AND tc.start_date <= CURRENT_DATE AND tc.end_date >= CURRENT_DATE
       AND cp.puzzle_id NOT IN (
         SELECT puzzle_id FROM puzzle_deliveries WHERE user_id = $2 AND puzzle_id IS NOT NULL
       )
     ORDER BY cp.position ASC, RANDOM()
     LIMIT 1`,
    [orgId, userId],
  )

  if (campaignRows[0]) {
    const { rows } = await db.query<PuzzleRow>(
      `SELECT id, type, difficulty, payload, correct_answer, explanation FROM puzzles WHERE id = $1`,
      [campaignRows[0].puzzle_id],
    )
    if (rows[0]) return rows[0]
  }

  const userResult = await db.query<{ risk_score: number }>(
    'SELECT risk_score FROM users WHERE id = $1',
    [userId],
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
    [userId],
  )

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
      [userId],
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
