# Step 3.10: Twilio Smishing Service (SMS Phishing Simulations)

## Prerequisites

- Twilio account with a phone number
- User must have explicitly opted in to receive SMS simulations (consent stored in DB)
- Only Growth/Enterprise orgs can use smishing

## Add consent column (new migration: 003_smishing_consent.sql)

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS smishing_consent_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
```

## apps/api/src/services/twilio.ts

```typescript
import twilio from 'twilio';
import { db } from '../db/client';
import { env } from '../config/env';

function getTwilioClient() {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured');
  }
  return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

type SmishingOptions = {
  targetUserId: string;
  targetPhone: string;
  message: string;
  trackingToken: string;
  orgId: string;
};

export async function sendSmishingSimulation(opts: SmishingOptions): Promise<void> {
  const { targetUserId, targetPhone, message, trackingToken, orgId } = opts;

  // Consent check — CLAUDE.md §4: explicit opt-in required
  const consentResult = await db.query<{ smishing_consent_at: Date | null }>(
    'SELECT smishing_consent_at FROM users WHERE id = $1',
    [targetUserId]
  );
  const user = consentResult.rows[0];

  if (!user?.smishing_consent_at) {
    throw new Error(`User ${targetUserId} has not consented to smishing simulations`);
  }

  // Audit log BEFORE send
  await db.query(
    `INSERT INTO audit_log (org_id, user_id, action, metadata) VALUES ($1, $2, 'smishing_pre_send', $3)`,
    [orgId, targetUserId, JSON.stringify({ token: trackingToken, timestamp: new Date().toISOString() })]
  );

  const clickUrl = `${env.TRACKING_BASE_URL}/track/click/${trackingToken}`;
  const client = getTwilioClient();

  await client.messages.create({
    body: `${message} ${clickUrl}`,
    from: env.TWILIO_FROM_NUMBER!,
    to: targetPhone,
  });

  await db.query(
    `INSERT INTO audit_log (org_id, user_id, action, metadata) VALUES ($1, $2, 'smishing_sent', $3)`,
    [orgId, targetUserId, JSON.stringify({ token: trackingToken })]
  );
}
```

Install Twilio: `pnpm add twilio && pnpm add -D @types/twilio`

**Note:** Twilio must be registered with your sending number. In the US, smishing simulations
using long codes require carrier registration. Use a Twilio Messaging Service for better deliverability.

**Commit:**
```bash
git add apps/api/src/services/twilio.ts apps/api/src/db/migrations/003_smishing_consent.sql
git commit -m "feat(services): add Twilio smishing simulation service with explicit consent gate"
```

**Update PROGRESS.md:** Check off 3.10. Set Last Completed to "3.10 — twilio.ts smishing".
