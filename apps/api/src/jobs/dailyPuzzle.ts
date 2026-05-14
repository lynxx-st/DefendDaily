import { Worker, type Job } from 'bullmq'
import { dailyPuzzleQueue, connection } from './queue'
import { db } from '../db/client'
import { redis } from '../db/redis'
import { env } from '../config/env'
import { logger } from '../config/logger'
import { selectPuzzle } from '../services/puzzleEngine'
import { buildPuzzleBlocks } from '../bots/slack/messages/puzzleMessage'
import { slackApp } from '../bots/slack/app'
import { triggerOnboardingIfDue } from '../services/onboarding'
import { getDueReviewPuzzleId } from '../services/spacedRepetition'

type OrgRow = {
  id: string
  slack_team_id: string
  slack_bot_token: string | null
}

type UserRow = {
  id: string
  provider_id: string
}

export async function scheduleDailyPuzzleJob(): Promise<void> {
  const existing = await dailyPuzzleQueue.getRepeatableJobs()
  await Promise.all(existing.map(j => dailyPuzzleQueue.removeRepeatableByKey(j.key)))
  await dailyPuzzleQueue.add('deliver-puzzles', {}, {
    repeat: { pattern: '0 9 * * *', tz: 'UTC' },
  })
  logger.info('Daily puzzle job scheduled (09:00 UTC)')
}

export const dailyPuzzleWorker = new Worker(
  'daily-puzzle',
  async (_job: Job) => {
    const { rows: orgs } = await db.query<OrgRow>(
      'SELECT id, slack_team_id, slack_bot_token FROM organizations WHERE slack_team_id IS NOT NULL'
    )
    await Promise.all(orgs.map(org => deliverForOrg(org)))
  },
  { connection, concurrency: 5, removeOnComplete: { count: 100 }, removeOnFail: { count: 500 } }
)

async function deliverForOrg(org: OrgRow): Promise<void> {
  const { rows: users } = await db.query<UserRow>(
    `SELECT id, provider_id FROM users
     WHERE org_id = $1 AND role = 'employee' AND provider_id IS NOT NULL`,
    [org.id]
  )

  for (const user of users) {
    if (await redis.get(`puzzle:today:${org.id}:${user.id}`)) continue

    const reviewPuzzleId = await getDueReviewPuzzleId(user.id)
    const puzzle = reviewPuzzleId
      ? await db.query<typeof selectPuzzle extends (...args: never[]) => Promise<infer T> ? NonNullable<T> : never>(
          `SELECT id, type, difficulty, payload, correct_answer, explanation FROM puzzles WHERE id = $1`,
          [reviewPuzzleId],
        ).then(r => r.rows[0] ?? null)
      : await selectPuzzle(user.id, org.id)
    if (!puzzle) continue

    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO puzzle_deliveries (user_id, puzzle_id, status) VALUES ($1, $2, 'pending') RETURNING id`,
      [user.id, puzzle.id]
    )
    const deliveryId = rows[0]!.id

    await redis.set(`puzzle:today:${org.id}:${user.id}`, puzzle.id, 'EX', 86400)

    await slackApp.client.chat.postMessage({
      token: org.slack_bot_token ?? env.SLACK_BOT_TOKEN,
      channel: user.provider_id,
      text: '🛡️ Your daily security puzzle is ready!',
      blocks: buildPuzzleBlocks(puzzle, deliveryId),
    })

    logger.info({ userId: user.id, orgId: org.id }, 'Daily puzzle delivered')
    await triggerOnboardingIfDue(user.id, user.provider_id)
  }
}

dailyPuzzleWorker.on('failed', async (job, err) => {
  logger.error({ job: job?.name, err }, 'Daily puzzle job failed')
  await db.query(
    `INSERT INTO audit_log (action, metadata) VALUES ('job_failure', $1)`,
    [JSON.stringify({ job: job?.name ?? 'unknown', error: err.message })]
  )
})
