# Step 1.12: Slack Bolt App + OAuth Install Flow

## Slack App Configuration (do this first at api.slack.com)

Create a Slack app with these settings:
- **Slash commands:** `/defend`, `/risk`, `/leaderboard`, `/phish-a-friend`, `/report-phish`
  - Request URL for each: `https://<ngrok-url>/slack/events`
- **Event subscriptions:** Enable, subscribe to `message.im`, `app_home_opened`
- **Interactivity:** Enable, Request URL: `https://<ngrok-url>/slack/events`
- **OAuth scopes (Bot Token):** `chat:write`, `commands`, `users:read`, `users:read.email`, `im:write`
- **OAuth redirect URL:** `https://<ngrok-url>/slack/oauth_redirect`

For local dev, use ngrok: `ngrok http 3001`

## apps/api/src/bots/slack/app.ts

```typescript
import { App, ExpressReceiver, Installation } from '@slack/bolt';
import { db } from '../../db/client';
import { env } from '../../config/env';

export const receiver = new ExpressReceiver({
  signingSecret: env.SLACK_SIGNING_SECRET,
  clientId: env.SLACK_CLIENT_ID,
  clientSecret: env.SLACK_CLIENT_SECRET,
  stateSecret: 'defend-daily-state-secret',
  scopes: ['chat:write', 'commands', 'users:read', 'users:read.email', 'im:write'],
  installationStore: {
    storeInstallation: async (installation: Installation) => {
      const teamId = installation.isEnterpriseInstall
        ? installation.enterprise?.id
        : installation.team?.id;
      const teamName = installation.isEnterpriseInstall
        ? installation.enterprise?.name
        : installation.team?.name;

      await db.query(`
        INSERT INTO organizations (name, slack_team_id)
        VALUES ($1, $2)
        ON CONFLICT (slack_team_id) DO UPDATE SET name = EXCLUDED.name
      `, [teamName ?? 'Unknown', teamId]);
    },
    fetchInstallation: async (installQuery) => {
      const teamId = installQuery.isEnterpriseInstall
        ? installQuery.enterpriseId
        : installQuery.teamId;

      const result = await db.query(
        'SELECT slack_bot_token, slack_installation FROM organizations WHERE slack_team_id = $1',
        [teamId]
      );
      if (!result.rows[0]) throw new Error(`No installation found for team ${teamId}`);
      return result.rows[0].slack_installation;
    },
    deleteInstallation: async (installQuery) => {
      const teamId = installQuery.isEnterpriseInstall
        ? installQuery.enterpriseId
        : installQuery.teamId;
      await db.query(
        'UPDATE organizations SET slack_team_id = NULL WHERE slack_team_id = $1',
        [teamId]
      );
    },
  },
});

export const slackApp = new App({ receiver });
```

> **Note:** Add `slack_bot_token` and `slack_installation JSONB` columns to the organizations table
> in a new migration `002_slack_installation.sql` if storing full installation objects.
> For Phase 1 simplicity, you can store the bot token directly in env and skip the installation store.

## apps/api/src/index.ts

```typescript
import 'dotenv/config';
import { receiver, slackApp } from './bots/slack/app';
import { env } from './config/env';

// Register all command and action handlers
import './bots/slack/commands/defend';
import './bots/slack/commands/leaderboard';
import './bots/slack/actions/answerHandler';

const app = receiver.app;
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

(async () => {
  await slackApp.start(env.PORT);
  console.log(`⚡ DefendDaily API running on :${env.PORT}`);
})();
```

**Verify:** `curl http://localhost:3001/health` returns `{"ok":true,"ts":"..."}`.

**Commit:**
```bash
git add apps/api/src/bots/ apps/api/src/index.ts
git commit -m "feat(slack): initialize Bolt app with OAuth install flow"
```

**Update PROGRESS.md:** Check off 1.12. Set Last Completed to "1.12 — Slack Bolt + OAuth".
