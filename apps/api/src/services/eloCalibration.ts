import { db } from '../db/client'

const K = 32

function expectedScore(playerElo: number, puzzleElo: number): number {
  return 1 / (1 + Math.pow(10, (puzzleElo - playerElo) / 400))
}

export async function updateEloRatings(
  userId: string,
  puzzleId: string,
  isCorrect: boolean,
): Promise<void> {
  const { rows } = await db.query<{ user_elo: number; puzzle_elo: number }>(
    `SELECT u.elo_level AS user_elo, p.elo_rating AS puzzle_elo
     FROM users u, puzzles p WHERE u.id = $1 AND p.id = $2`,
    [userId, puzzleId],
  )
  const row = rows[0]
  if (!row) return

  const actualScore = isCorrect ? 1 : 0
  const expected = expectedScore(row.user_elo, row.puzzle_elo)

  const newUserElo = Math.round(row.user_elo + K * (actualScore - expected))
  const newPuzzleElo = Math.round(row.puzzle_elo + K * ((1 - actualScore) - (1 - expected)))

  await Promise.all([
    db.query(`UPDATE users SET elo_level = $1 WHERE id = $2`, [Math.max(800, Math.min(2400, newUserElo)), userId]),
    db.query(`UPDATE puzzles SET elo_rating = $1 WHERE id = $2`, [Math.max(800, Math.min(2400, newPuzzleElo)), puzzleId]),
  ])
}

export async function selectEloMatchedPuzzle(userId: string, excludeIds: string[]): Promise<string | null> {
  const { rows: userRows } = await db.query<{ elo_level: number }>(
    `SELECT elo_level FROM users WHERE id = $1`,
    [userId],
  )
  const userElo = userRows[0]?.elo_level ?? 1200

  const excluded = excludeIds.length > 0 ? excludeIds : ['00000000-0000-0000-0000-000000000000']
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM puzzles WHERE active = true AND id != ALL($1) ORDER BY ABS(elo_rating - $2) ASC LIMIT 1`,
    [excluded, userElo],
  )
  return rows[0]?.id ?? null
}
