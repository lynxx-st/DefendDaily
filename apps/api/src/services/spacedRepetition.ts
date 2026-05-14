import { db } from '../db/client'

const BOX_INTERVALS: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 }

export async function updateLeitnerBox(
  userId: string,
  puzzleId: string,
  isCorrect: boolean,
): Promise<void> {
  const { rows } = await db.query<{ leitner_box: number }>(
    `SELECT leitner_box FROM user_puzzle_state WHERE user_id = $1 AND puzzle_id = $2`,
    [userId, puzzleId],
  )
  const currentBox = rows[0]?.leitner_box ?? 1
  const newBox = isCorrect ? Math.min(currentBox + 1, 5) : 1
  const interval = BOX_INTERVALS[newBox] ?? 1
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  await db.query(
    `INSERT INTO user_puzzle_state (user_id, puzzle_id, leitner_box, next_review_date, last_answered_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, puzzle_id) DO UPDATE
       SET leitner_box = $3, next_review_date = $4, last_answered_at = NOW()`,
    [userId, puzzleId, newBox, nextReview.toISOString().split('T')[0]],
  )
}

export async function getDueReviewPuzzleId(userId: string): Promise<string | null> {
  const { rows } = await db.query<{ puzzle_id: string }>(
    `SELECT puzzle_id FROM user_puzzle_state
     WHERE user_id = $1 AND next_review_date <= CURRENT_DATE AND leitner_box < 5
     ORDER BY next_review_date ASC, leitner_box ASC LIMIT 1`,
    [userId],
  )
  return rows[0]?.puzzle_id ?? null
}
