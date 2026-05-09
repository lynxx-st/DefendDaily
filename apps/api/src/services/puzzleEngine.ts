import { db } from '../db/client'
import type { PuzzleRow } from '../bots/slack/messages/puzzleMessage'

export async function selectPuzzle(userId: string, _orgId: string): Promise<PuzzleRow | null> {
  const { rows } = await db.query<PuzzleRow>(`
    SELECT id, type, difficulty, payload, correct_answer, explanation
    FROM puzzles
    WHERE active = true
      AND id NOT IN (
        SELECT puzzle_id FROM puzzle_deliveries
        WHERE user_id = $1 AND puzzle_id IS NOT NULL
      )
    ORDER BY RANDOM()
    LIMIT 1
  `, [userId])
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
