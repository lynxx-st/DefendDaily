import { Worker, Queue } from 'bullmq'
import { connection } from './queue'
import { db } from '../db/client'
import { logger } from '../config/logger'

export const retirementQueue = new Queue('puzzle-retirement', { connection })

export const retirementWorker = new Worker(
  'puzzle-retirement',
  async () => {
    const { rows } = await db.query<{ id: string; accuracy: string; total: string }>(`
      SELECT p.id,
             ROUND(COUNT(CASE WHEN pd.is_correct THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1)::text AS accuracy,
             COUNT(*)::text AS total
      FROM puzzles p
      JOIN puzzle_deliveries pd ON pd.puzzle_id = p.id
      WHERE p.active = true
      GROUP BY p.id
      HAVING COUNT(*) >= 100
        AND (COUNT(CASE WHEN pd.is_correct THEN 1 END)::numeric / COUNT(*) * 100) >= 95
    `)

    for (const row of rows) {
      await db.query(`UPDATE puzzles SET active = false WHERE id = $1`, [row.id])
      logger.info({ puzzleId: row.id, accuracy: row.accuracy, total: row.total }, 'Puzzle retired: too easy')
    }

    if (rows.length > 0) {
      logger.info({ count: rows.length }, 'Puzzles retired this cycle')
    }
  },
  { connection, concurrency: 1 },
)

retirementWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, 'puzzle-retirement job failed')
})

export async function schedulePuzzleRetirementJob() {
  await retirementQueue.add('weekly', {}, {
    repeat: { pattern: '0 4 * * SUN' },
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 10 },
  })
}
