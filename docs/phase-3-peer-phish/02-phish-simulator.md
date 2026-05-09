# Step 3.02: phishSimulator.ts (Nodemailer + Tracking Injection)

## apps/api/src/services/phishSimulator.ts

```typescript
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { db } from '../db/client';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

type PhishTemplate = {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  lure_type: string;
  difficulty: string;
};

type SendPhishOptions = {
  senderId: string;
  targetId: string;
  targetEmail: string;
  template: PhishTemplate;
  orgId: string;
};

export async function sendPhishSimulation(opts: SendPhishOptions): Promise<string> {
  const { senderId, targetId, targetEmail, template, orgId } = opts;

  // Generate unique tracking token
  const trackingToken = crypto.randomBytes(32).toString('hex'); // 64 chars

  // Inject tracking pixel and click redirect into email body
  const trackingPixelUrl = `${env.TRACKING_BASE_URL}/track/open/${trackingToken}`;
  const clickUrl = `${env.TRACKING_BASE_URL}/track/click/${trackingToken}`;

  // Replace all href="..." in template with tracked redirect
  const trackedHtml = template.body_html
    .replace(/href="([^"]+)"/g, `href="${clickUrl}"`)
    + `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />`;

  // Record campaign BEFORE sending (legal requirement — CLAUDE.md §10)
  await db.query(`
    INSERT INTO phish_campaigns (sender_id, target_id, template_id, tracking_token)
    VALUES ($1, $2, $3, $4)
  `, [senderId, targetId, template.id, trackingToken]);

  await db.query(`
    INSERT INTO audit_log (org_id, user_id, action, metadata)
    VALUES ($1, $2, 'peer_phish_sent', $3)
  `, [orgId, senderId, JSON.stringify({ targetId, templateId: template.id, token: trackingToken })]);

  await transporter.sendMail({
    from: `"IT Support" <noreply@${env.PHISH_FROM_DOMAIN}>`,
    to: targetEmail,
    subject: template.subject,
    html: trackedHtml,
    headers: {
      'X-DefendDaily-Simulation': 'true', // internal header for filtering
    },
  });

  return trackingToken;
}
```

**Commit:**
```bash
git add apps/api/src/services/phishSimulator.ts
git commit -m "feat(services): add Nodemailer phish simulator with tracking pixel injection"
```

**Update PROGRESS.md:** Check off 3.02. Set Last Completed to "3.02 — phishSimulator.ts".
