import { slackApp } from '../app'
import { db } from '../../../db/client'
import { sendPhishSimulation } from '../../../services/phishSimulator'

slackApp.view('phish_send_modal', async ({ view, ack, body, client }) => {
  await ack()

  const { orgId } = JSON.parse(view.private_metadata) as { orgId: string }
  const slackSenderId = body.user.id
  const templateId =
    view.state.values['template_block']?.['template_select']?.selected_option?.value
  const targetId =
    view.state.values['target_block']?.['target_select']?.selected_option?.value

  if (!templateId || !targetId) return

  // All three assertions run in one DB round-trip
  const [targetResult, orgResult, senderResult, templateResult] = await Promise.all([
    db.query<{ id: string; email: string; is_peer_phish_target: boolean }>(
      'SELECT id, email, is_peer_phish_target FROM users WHERE id = $1',
      [targetId]
    ),
    db.query<{ peer_phish_enabled: boolean }>(
      'SELECT peer_phish_enabled FROM organizations WHERE id = $1',
      [orgId]
    ),
    db.query<{ id: string }>(
      'SELECT id FROM users WHERE provider_id = $1',
      [slackSenderId]
    ),
    db.query<{ id: string; name: string; subject: string; body_html: string; lure_type: string; difficulty: string }>(
      'SELECT * FROM phish_templates WHERE id = $1 AND active = true',
      [templateId]
    ),
  ])

  const target = targetResult.rows[0]
  const org = orgResult.rows[0]
  const sender = senderResult.rows[0]
  const template = templateResult.rows[0]

  if (!target?.is_peer_phish_target) {
    await client.chat.postMessage({ channel: slackSenderId, text: '❌ That user has not opted into the Peer Phish program.' })
    return
  }
  if (!org?.peer_phish_enabled) {
    await client.chat.postMessage({ channel: slackSenderId, text: '❌ Peer Phish is not enabled for your organization.' })
    return
  }
  if (!template) {
    await client.chat.postMessage({ channel: slackSenderId, text: '❌ Selected template is no longer available.' })
    return
  }

  const senderId = sender?.id ?? slackSenderId
  const now = new Date().toISOString()

  // Write assertion-passed + TOS acknowledgment to audit_log BEFORE sending
  await db.query(
    `INSERT INTO audit_log (org_id, user_id, action, metadata) VALUES
     ($1, $2, 'peer_phish_pre_send_assertion_passed', $3),
     ($1, $2, 'peer_phish_tos_acknowledged', $4)`,
    [
      orgId,
      senderId,
      JSON.stringify({ templateId, targetId, timestamp: now }),
      JSON.stringify({ templateId, targetId, userId: senderId, timestamp: now, tosVersion: '1.0' }),
    ]
  )

  try {
    const token = await sendPhishSimulation({
      senderId,
      targetId,
      targetEmail: target.email,
      template,
      orgId,
    })

    await client.chat.postMessage({
      channel: slackSenderId,
      text: `✅ Phish sent! Token: \`${token.substring(0, 8)}...\` — you'll be notified if they click.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    await db.query(
      `INSERT INTO audit_log (org_id, action, metadata) VALUES ($1, 'peer_phish_send_failure', $2)`,
      [orgId, JSON.stringify({ error: message })]
    )
    await client.chat.postMessage({
      channel: slackSenderId,
      text: '❌ Failed to send the simulation. Please try again.',
    })
  }
})
