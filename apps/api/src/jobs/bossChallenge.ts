import { Queue, Worker } from 'bullmq'
import { connection } from './queue'
import { db } from '../db/client'
import { logger } from '../config/logger'

const bossChallengeQueue = new Queue('boss-challenge', {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
  },
})

// Fires on the 1st of each month at 9:00 AM UTC
export async function scheduleBossChallengeJob() {
  await bossChallengeQueue.add(
    'monthly-boss',
    {},
    { repeat: { pattern: '0 9 1 * *' } },
  )
}

export const bossChallengeWorker = new Worker(
  'boss-challenge',
  async () => {
    const puzzleResult = await db.query<{ id: string }>(
      `SELECT id FROM puzzles WHERE difficulty = 'hard' AND active = true ORDER BY RANDOM() LIMIT 1`,
    )
    const puzzle = puzzleResult.rows[0]
    if (!puzzle) {
      logger.warn('boss challenge: no hard puzzle available')
      return
    }

    const orgsResult = await db.query<{ id: string; slack_team_id: string }>(
      `SELECT id, slack_team_id FROM organizations WHERE slack_team_id IS NOT NULL`,
    )

    for (const org of orgsResult.rows) {
      const usersResult = await db.query<{ id: string; provider_id: string }>(
        `SELECT id, provider_id FROM users WHERE org_id = $1 AND provider_type = 'slack'`,
        [org.id],
      )
      for (const user of usersResult.rows) {
        await bossChallengeQueue.add('deliver-boss-puzzle', {
          userId: user.id,
          providerId: user.provider_id,
          puzzleId: puzzle.id,
          orgId: org.id,
          multiplier: 2,
        })
      }
    }

    logger.info({ puzzleId: puzzle.id, orgCount: orgsResult.rows.length }, 'boss challenge dispatched')
  },
  { connection, concurrency: 5 },
)
