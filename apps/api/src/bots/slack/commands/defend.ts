import { slackApp } from '../app'
import { db } from '../../../db/client'
import { redis } from '../../../db/redis'
import { buildPuzzleBlocks } from '../messages/puzzleMessage'
import { selectPuzzle } from '../../../services/puzzleEngine'

slackApp.command('/defend', async ({ command, ack, respond }) => {
  await ack()

  const { user_id, team_id, user_name } = command

  const { rows: orgRows } = await db.query<{ id: string }>(
    'SELECT id FROM organizations WHERE slack_team_id = $1',
    [team_id]
  )
  if (!orgRows[0]) {
    await respond({ text: 'Organization not found. Please reinstall the app.' })
    return
  }
  const orgId = orgRows[0].id

  const { rows: userRows } = await db.query<{ id: string }>(`
    INSERT INTO users (org_id, email, display_name, provider_id, provider_type)
    VALUES ($1, $2, $3, $4, 'slack')
    ON CONFLICT (org_id, email) DO UPDATE SET provider_id = EXCLUDED.provider_id
    RETURNING id
  `, [orgId, `${user_id}@slack.local`, user_name, user_id])
  const userId = userRows[0]!.id

  const alreadySent = await redis.get(`puzzle:today:${orgId}:${userId}`)
  if (alreadySent) {
    await respond({ text: "You already have today's puzzle! Come back tomorrow. 🛡️" })
    return
  }

  const puzzle = await selectPuzzle(userId, orgId)
  if (!puzzle) {
    await respond({ text: 'No puzzles available right now. Check back soon!' })
    return
  }

  const { rows: deliveryRows } = await db.query<{ id: string }>(
    `INSERT INTO puzzle_deliveries (user_id, puzzle_id, status) VALUES ($1, $2, 'pending') RETURNING id`,
    [userId, puzzle.id]
  )
  const deliveryId = deliveryRows[0]!.id

  await redis.set(`puzzle:today:${orgId}:${userId}`, puzzle.id, 'EX', 86400)

  await respond({
    text: '🛡️ Your daily security puzzle:',
    blocks: buildPuzzleBlocks(puzzle, deliveryId),
    response_type: 'ephemeral',
  })
})
