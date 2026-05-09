# Steps 3.07 + 3.08 + 3.10: Pre-Send Assertions + TOS + Audit Log

## apps/api/src/bots/slack/actions/phishSendHandler.ts

This handles the modal submission (`callback_id: 'phish_send_modal'`).

```typescript
import { slackApp } from '../app';
import { db } from '../../../db/client';
import { sendPhishSimulation } from '../../../services/phishSimulator';

slackApp.view('phish_send_modal', async ({ view, ack, body, client }) => {
  await ack();

  const { orgId } = JSON.parse(view.private_metadata) as { orgId: string };
  const senderId = body.user.id; // Slack user ID
  const templateId = view.state.values['template_block']?.['template_select']?.selected_option?.value;
  const targetId = view.state.values['target_block']?.['target_select']?.selected_option?.value;

  if (!templateId || !targetId) return;

  // ── PRE-SEND ASSERTIONS (CLAUDE.md §10) ──────────────────────────────────
  const [targetResult, orgResult, senderResult, templateResult] = await Promise.all([
    db.query('SELECT id, email, is_peer_phish_target FROM users WHERE id = $1', [targetId]),
    db.query('SELECT peer_phish_enabled FROM organizations WHERE id = $1', [orgId]),
    db.query('SELECT id FROM users WHERE provider_id = $1', [senderId]),
    db.query('SELECT * FROM phish_templates WHERE id = $1 AND active = true', [templateId]),
  ]);

  const target = targetResult.rows[0];
  const org = orgResult.rows[0];
  const sender = senderResult.rows[0];
  const template = templateResult.rows[0];

  // Assertion 1: target has opted in
  if (!target?.is_peer_phish_target) {
    await client.chat.postMessage({
      channel: senderId,
      text: '❌ That user has not opted into the Peer Phish program.',
    });
    return;
  }

  // Assertion 2: org has peer phish enabled
  if (!org?.peer_phish_enabled) {
    await client.chat.postMessage({
      channel: senderId,
      text: '❌ Peer Phish is not enabled for your organization.',
    });
    return;
  }

  // Assertion 3: template exists and is active
  if (!template) {
    await client.chat.postMessage({
      channel: senderId,
      text: '❌ Selected template is no longer available.',
    });
    return;
  }

  // ── AUDIT LOG ENTRY (written BEFORE send) ────────────────────────────────
  await db.query(`
    INSERT INTO audit_log (org_id, user_id, action, metadata)
    VALUES ($1, $2, 'peer_phish_pre_send_assertion_passed', $3)
  `, [orgId, sender?.id, JSON.stringify({
    templateId, targetId, timestamp: new Date().toISOString()
  })]);

  // ── TOS ACKNOWLEDGMENT (Step 3.08) ───────────────────────────────────────
  // Log TOS acknowledgment (user clicked "Review & Send" = implicit TOS accept)
  await db.query(`
    INSERT INTO audit_log (org_id, user_id, action, metadata)
    VALUES ($1, $2, 'peer_phish_tos_acknowledged', $3)
  `, [orgId, sender?.id, JSON.stringify({
    templateId, targetId, userId: sender?.id,
    timestamp: new Date().toISOString(),
    tosVersion: '1.0',
  })]);

  // ── SEND ─────────────────────────────────────────────────────────────────
  try {
    const token = await sendPhishSimulation({
      senderId: sender?.id,
      targetId,
      targetEmail: target.email,
      template,
      orgId,
    });

    await client.chat.postMessage({
      channel: senderId,
      text: `✅ Phish sent! Token: \`${token.substring(0, 8)}...\` — you'll be notified if they click.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await db.query(
      `INSERT INTO audit_log (org_id, action, metadata) VALUES ($1, 'peer_phish_send_failure', $2)`,
      [orgId, JSON.stringify({ error: message })]
    );
    await client.chat.postMessage({
      channel: senderId,
      text: '❌ Failed to send phishing simulation. Please try again.',
    });
  }
});
```

Register: `import './bots/slack/actions/phishSendHandler';` in index.ts

**Commit:**
```bash
git add apps/api/src/bots/slack/actions/phishSendHandler.ts
git commit -m "feat(slack): add phish send handler with pre-send assertions, TOS logging, and audit trail"
```

**Update PROGRESS.md:** Check off 3.07, 3.08, 3.10 (audit entries). Set Last Completed to "3.08 — TOS + assertions".
