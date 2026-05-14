import { slackApp } from '../app'
import { db } from '../../../db/client'
import { dailyPuzzleQueue } from '../../../jobs/queue'

slackApp.command('/send-now', async ({ command, ack, client }) => {
  await ack()

  const { rows: orgRows } = await db.query<{ id: string }>(
    `SELECT o.id FROM organizations o
     JOIN users u ON u.org_id = o.id
     WHERE u.provider_id = $1 AND u.role IN ('ciso', 'admin')`,
    [command.user_id],
  )
  const org = orgRows[0]
  if (!org) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'Admin only.',
    })
    return
  }

  await dailyPuzzleQueue.add('manual-delivery', { orgId: org.id, force: true }, {
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 10 },
  })

  await client.chat.postEphemeral({
    channel: command.channel_id,
    user: command.user_id,
    text: 'Puzzle delivery triggered for your org. Messages will arrive shortly.',
  })
})
