import { createHash } from 'node:crypto'
import { db } from '../db/client'

export function assignVariant(userId: string, variantGroup: string): 'A' | 'B' {
  const hash = createHash('sha256').update(userId + variantGroup).digest('hex')
  return parseInt(hash.slice(0, 8), 16) % 2 === 0 ? 'A' : 'B'
}

export async function getPuzzleForVariant(variantGroup: string, variant: 'A' | 'B'): Promise<string | null> {
  const { rows } = await db.query<{ puzzle_id: string }>(
    `SELECT puzzle_id FROM puzzle_variants WHERE variant_group = $1 AND variant_label = $2`,
    [variantGroup, variant],
  )
  return rows[0]?.puzzle_id ?? null
}

export async function recordAbResult(
  variantGroup: string,
  variant: 'A' | 'B',
  userId: string,
  isCorrect: boolean,
  responseTimeMs: number,
): Promise<void> {
  await db.query(
    `INSERT INTO ab_results (variant_group, variant_label, user_id, is_correct, response_time_ms) VALUES ($1, $2, $3, $4, $5)`,
    [variantGroup, variant, userId, isCorrect, responseTimeMs],
  )
}
