import { slackApp } from '../app'
import { redis } from '../../../db/redis'
import { db } from '../../../db/client'
import { getUserByProviderId } from '../../../services/userService'

slackApp.command('/freeze', async ({ command, ack, client }) => {
  await ack()

  const user = await getUserByProviderId(command.user_id, 'slack')
  if (!user) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'No DefendDaily account found.',
    })
    return
  }

  const freezeKey = `streak_freeze:${user.id}`
  const count = await redis.get(freezeKey)
  const tokens = count ? parseInt(count, 10) : 0

  if (tokens < 1) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: "You don't have any streak freeze tokens. Earn one by maintaining a 7-day streak!",
    })
    return
  }

  const deliveryResult = await db.query<{ id: string; status: string }>(`
    SELECT id, status FROM puzzle_deliveries
    WHERE user_id = $1
      AND delivered_at::date = CURRENT_DATE
      AND status IN ('pending', 'skipped')
    LIMIT 1
  `, [user.id])

  if (!deliveryResult.rows[0]) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: "No puzzle to freeze today — you've already answered it, or it hasn't been delivered yet.",
    })
    return
  }

  await redis.decr(freezeKey)
  await db.query(
    `UPDATE puzzle_deliveries SET status = 'frozen' WHERE id = $1`,
    [deliveryResult.rows[0].id],
  )

  const remaining = tokens - 1
  await client.chat.postMessage({
    channel: command.user_id,
    text: `🧊 Streak freeze applied! Your ${user.streak}-day streak is safe. ${remaining} freeze token${remaining !== 1 ? 's' : ''} remaining.`,
  })
})
