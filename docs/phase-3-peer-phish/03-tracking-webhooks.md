# Steps 3.03 + 3.04 + 3.11: Tracking Webhooks + Rate Limiting

## Install express-rate-limit

```bash
cd apps/api && pnpm add express-rate-limit
```

## apps/api/src/routes/webhooks.ts

```typescript
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db/client';
import { slackApp } from '../bots/slack/app';

export const webhooksRouter = Router();

// Rate limit: 60 requests per minute per IP (prevents token enumeration)
const trackingLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    // Still return 200 — never reveal rate limiting to attacker
    res.status(200).send();
  },
});

// 1×1 transparent GIF pixel (44 bytes)
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// GET /track/open/:token — email open tracking pixel
webhooksRouter.get('/track/open/:token', trackingLimiter, async (req: Request, res: Response) => {
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store');
  res.status(200).send(PIXEL); // ALWAYS 200, regardless of token validity

  // Fire-and-forget: record open asynchronously
  void recordOpen(req.params.token!);
});

// GET /track/click/:token — phishing link click redirect
webhooksRouter.get('/track/click/:token', trackingLimiter, async (req: Request, res: Response) => {
  res.redirect(302, 'https://www.defenddaily.com/clicked'); // safe landing page
  // ALWAYS redirect, never reveal token validity

  void recordClick(req.params.token!);
});

async function recordOpen(token: string): Promise<void> {
  try {
    const result = await db.query(
      `UPDATE phish_campaigns SET opened_at = NOW()
       WHERE tracking_token = $1 AND opened_at IS NULL
       RETURNING target_id`,
      [token]
    );
    if (!result.rows[0]) return;
    // No Slack notification for opens — only clicks and reports trigger teachable moments
  } catch (err) {
    console.error('recordOpen error:', err);
  }
}

async function recordClick(token: string): Promise<void> {
  try {
    const result = await db.query(`
      UPDATE phish_campaigns
      SET clicked_at = NOW(), outcome = 'clicked'
      WHERE tracking_token = $1 AND clicked_at IS NULL
      RETURNING target_id, sender_id
    `, [token]);

    if (!result.rows[0]) return;
    const { target_id, sender_id } = result.rows[0];

    // Fetch target's Slack provider_id for teachable moment
    const userResult = await db.query<{ provider_id: string }>(
      'SELECT provider_id FROM users WHERE id = $1', [target_id]
    );
    if (!userResult.rows[0]) return;

    // Send teachable moment DM to target
    await slackApp.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: userResult.rows[0].provider_id,
      text: '🎣 You clicked a simulated phishing link!',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🎣 Simulated Phishing Alert!' },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'You just clicked a *simulated phishing link* sent by a coworker as part of DefendDaily\'s Peer Phish program.\n\nThis was a safe simulation — no harm done! Here\'s what to watch for next time:',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '• Check the sender address carefully — does it match the real company domain?\n• Hover over links before clicking — does the URL look right?\n• Unexpected urgency is a red flag (wire transfers, password resets, prizes)\n• When in doubt, report it with `/report-phish`',
          },
        },
      ],
    });

    // Award attacker points to sender
    await db.query(
      `UPDATE users SET longest_streak = longest_streak + 5 WHERE id = $1`,
      [sender_id]
    ); // TODO Phase 4: add proper "attacker points" leaderboard column
  } catch (err) {
    console.error('recordClick error:', err);
  }
}
```

Wire into index.ts:
```typescript
import { webhooksRouter } from './routes/webhooks';
receiver.app.use('/track', webhooksRouter);
```

**Commit:**
```bash
git add apps/api/src/routes/webhooks.ts
git commit -m "feat(routes): add phish tracking pixel and click redirect webhooks with rate limiting"
```

**Update PROGRESS.md:** Check off 3.03, 3.04, 3.11. Set Last Completed to "3.11 — webhooks + rate limiting".
