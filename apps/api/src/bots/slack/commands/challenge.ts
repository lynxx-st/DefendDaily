import { randomUUID } from 'node:crypto'
import { slackApp } from '../app'
import { redis } from '../../../db/redis'
import { db } from '../../../db/client'
import { buildPuzzleBlocks, type PuzzleRow } from '../messages/puzzleMessage'

slackApp.command('/challenge', async ({ command, ack, client }) => {
  await ack()

  const targetSlackId = command.text.trim().replace(/^<@([A-Z0-9]+)\|.*>$/, '$1')
  if (!targetSlackId || targetSlackId === command.user_id) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'Usage: `/challenge @username`',
    })
    return
  }

  const [senderResult, receiverResult] = await Promise.all([
    db.query<{ id: string }>(`SELECT id FROM users WHERE provider_id = $1 AND provider_type = 'slack'`, [command.user_id]),
    db.query<{ id: string }>(`SELECT id FROM users WHERE provider_id = $1 AND provider_type = 'slack'`, [targetSlackId]),
  ])
  const senderId = senderResult.rows[0]?.id
  const receiverId = receiverResult.rows[0]?.id

  if (!senderId || !receiverId) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'User not found in DefendDaily.',
    })
    return
  }

  const { rows: puzzleRows } = await db.query<PuzzleRow>(
    `SELECT id, type, difficulty, payload, correct_answer, explanation
     FROM puzzles WHERE active = true ORDER BY random() LIMIT 1`,
  )
  const puzzle = puzzleRows[0]
  if (!puzzle) return

  const challengeId = randomUUID()
  await redis.hset(`challenge:${challengeId}`, {
    sender_id: senderId,
    receiver_id: receiverId,
    puzzle_id: puzzle.id,
    sender_slack_id: command.user_id,
    receiver_slack_id: targetSlackId,
    sender_answered: '0',
    receiver_answered: '0',
  })
  await redis.expire(`challenge:${challengeId}`, 3600)

  await Promise.all([
    client.chat.postMessage({
      channel: command.user_id,
      text: `You challenged <@${targetSlackId}>! Here is your puzzle:`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blocks: buildPuzzleBlocks(puzzle, `challenge:${challengeId}:sender`) as any,
    }),
    client.chat.postMessage({
      channel: targetSlackId,
      text: `<@${command.user_id}> challenged you to a head-to-head puzzle! Respond quickly!`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blocks: buildPuzzleBlocks(puzzle, `challenge:${challengeId}:receiver`) as any,
    }),
  ])
})
