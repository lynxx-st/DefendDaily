# Steps 5.06 + 5.08: Canary Token Service + Webhook Callback

## apps/api/src/services/canary.ts

```typescript
import axios from 'axios';
import { db } from '../db/client';
import { env } from '../config/env';

type CanaryTokenType = 'doc' | 'pdf' | 'excel' | 'img' | 'url';

type CanaryTokenResponse = {
  token: string;
  token_url: string;
  auth_token: string;
  hostname: string;
};

const CANARY_API = 'https://canarytokens.org/generate';

export async function createCanaryToken(
  userId: string,
  fileType: CanaryTokenType,
  description: string
): Promise<CanaryTokenResponse> {
  const webhookUrl = `${env.CANARY_WEBHOOK_BASE ?? 'http://localhost:3001/webhooks/canary'}/${userId}`;

  const response = await axios.post<CanaryTokenResponse>(
    CANARY_API,
    new URLSearchParams({
      type: fileType,
      webhook_url: webhookUrl,
      memo: description,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { token, token_url, auth_token, hostname } = response.data;

  // Store in DB
  await db.query(`
    INSERT INTO canary_tokens (user_id, token_id, file_type, description)
    VALUES ($1, $2, $3, $4)
  `, [userId, token, fileType, description]);

  return { token, token_url, auth_token, hostname };
}

export async function createHomeDefenseKit(userId: string): Promise<CanaryTokenResponse[]> {
  const tokens = await Promise.all([
    createCanaryToken(userId, 'doc',   'Home Defense — Word Document'),
    createCanaryToken(userId, 'pdf',   'Home Defense — PDF Document'),
    createCanaryToken(userId, 'excel', 'Home Defense — Excel Spreadsheet'),
    createCanaryToken(userId, 'img',   'Home Defense — Image File'),
    createCanaryToken(userId, 'url',   'Home Defense — Web Shortcut'),
  ]);
  return tokens;
}
```

## Canary Webhook Callback (add to apps/api/src/routes/webhooks.ts)

```typescript
// POST /webhooks/canary/:userId — fired by Canarytokens.org when a token is triggered
webhooksRouter.post('/canary/:userId', async (req: Request, res: Response) => {
  res.status(200).json({ ok: true }); // Acknowledge immediately

  const { userId } = req.params;
  const { token } = req.body as { token?: string };

  if (!token) return;

  try {
    // Mark token as triggered
    const result = await db.query(`
      UPDATE canary_tokens SET triggered_at = NOW()
      WHERE user_id = $1 AND token_id = $2 AND triggered_at IS NULL
      RETURNING description, file_type
    `, [userId, token]);

    if (!result.rows[0]) return;
    const { description, file_type } = result.rows[0];

    // Alert the user
    const userResult = await db.query<{ provider_id: string }>(
      'SELECT provider_id FROM users WHERE id = $1', [userId]
    );
    if (!userResult.rows[0]) return;

    await slackApp.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: userResult.rows[0].provider_id,
      text: '⚠️ Canary Token Triggered! A honey trap file was accessed.',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '⚠️ Security Alert: Canary Token Triggered!' },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Your canary token *"${description}"* (${file_type}) was just accessed.\n\n*This may mean your computer has been compromised.*\n\nImmediate actions:\n1. Disconnect from the internet\n2. Run a full antivirus scan\n3. Contact IT support immediately`,
          },
        },
      ],
    });
  } catch (err) {
    console.error('Canary webhook error:', err);
  }
});
```

**Commit:**
```bash
git add apps/api/src/services/canary.ts apps/api/src/routes/webhooks.ts
git commit -m "feat(services): add canary token service with Canarytokens.org API and webhook alert"
```

**Update PROGRESS.md:** Check off 5.06 and 5.08. Set Last Completed to "5.08 — canary webhook".
