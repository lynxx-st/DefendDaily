# Step 3.06: /phish-a-friend Slack Modal

## apps/api/src/bots/slack/commands/phishAFriend.ts

```typescript
import { slackApp } from '../app';
import { db } from '../../../db/client';

slackApp.command('/phish-a-friend', async ({ command, ack, client }) => {
  await ack();

  // Check org has peer phish enabled
  const orgResult = await db.query(
    'SELECT id, peer_phish_enabled FROM organizations WHERE slack_team_id = $1',
    [command.team_id]
  );
  const org = orgResult.rows[0];
  if (!org?.peer_phish_enabled) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'Peer Phish is not enabled for your organization. Contact your admin.',
    });
    return;
  }

  // Fetch available templates
  const templates = await db.query(
    'SELECT id, name, lure_type, difficulty FROM phish_templates WHERE active = true ORDER BY difficulty'
  );

  // Fetch opt-in targets (excluding self)
  const targets = await db.query(
    `SELECT u.id, u.display_name, u.provider_id FROM users u
     WHERE u.org_id = $1 AND u.is_peer_phish_target = true AND u.provider_id != $2`,
    [org.id, command.user_id]
  );

  if (targets.rows.length === 0) {
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: 'No opted-in targets available yet. Encourage coworkers to join the Defender League!',
    });
    return;
  }

  await client.views.open({
    trigger_id: command.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'phish_send_modal',
      title: { type: 'plain_text', text: '🎣 Send a Phish' },
      submit: { type: 'plain_text', text: 'Review & Send' },
      close: { type: 'plain_text', text: 'Cancel' },
      private_metadata: JSON.stringify({ orgId: org.id, senderId: command.user_id }),
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '⚠️ By sending a phishing simulation you agree to the *Peer Phish Terms of Use*. All simulations are logged.',
          },
        },
        {
          type: 'input',
          block_id: 'template_block',
          label: { type: 'plain_text', text: 'Choose a phish template' },
          element: {
            type: 'static_select',
            action_id: 'template_select',
            placeholder: { type: 'plain_text', text: 'Select template...' },
            options: templates.rows.map(t => ({
              text: { type: 'plain_text', text: `${t.name} (${t.difficulty})` },
              value: t.id,
            })),
          },
        },
        {
          type: 'input',
          block_id: 'target_block',
          label: { type: 'plain_text', text: 'Select target (opted-in only)' },
          element: {
            type: 'static_select',
            action_id: 'target_select',
            placeholder: { type: 'plain_text', text: 'Select teammate...' },
            options: targets.rows.map(u => ({
              text: { type: 'plain_text', text: u.display_name ?? u.provider_id },
              value: u.id,
            })),
          },
        },
      ],
    },
  });
});
```

Register: `import './bots/slack/commands/phishAFriend';` in index.ts

**Commit:**
```bash
git add apps/api/src/bots/slack/commands/phishAFriend.ts
git commit -m "feat(slack): add /phish-a-friend modal with template browser and opt-in target selection"
```

**Update PROGRESS.md:** Check off 3.06. Set Last Completed to "3.06 — phish modal".
