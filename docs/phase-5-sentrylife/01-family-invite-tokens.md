# Steps 5.01 + 5.10: Family Invite Tokens + DB Linking

## New migration: apps/api/src/db/migrations/004_family_invites.sql

```sql
CREATE TABLE IF NOT EXISTS family_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token         VARCHAR(64) UNIQUE NOT NULL,
  email         VARCHAR(255),
  role          VARCHAR(20) DEFAULT 'senior', -- senior | child
  accepted_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_family_invites_token ON family_invites(token);
```

## apps/api/src/routes/family.ts

```typescript
import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/client';
import { requireAuth } from '../middleware/auth';

export const familyRouter = Router();

// POST /api/family/invite — generate invite link
familyRouter.post('/invite', requireAuth, async (req, res) => {
  const { role = 'senior', email } = req.body as { role?: string; email?: string };
  const userId = req.user!.id;

  const token = crypto.randomBytes(32).toString('hex');

  await db.query(`
    INSERT INTO family_invites (inviter_id, token, email, role)
    VALUES ($1, $2, $3, $4)
  `, [userId, token, email ?? null, role]);

  const inviteUrl = `${process.env.NEXTAUTH_URL}/sentrylife/join?token=${token}`;
  res.json({ invite_url: inviteUrl, token, expires_in: '7 days' });
});

// POST /api/family/accept — accept invite and link accounts
familyRouter.post('/accept', requireAuth, async (req, res) => {
  const { token } = req.body as { token: string };
  const newUserId = req.user!.id;

  const inviteResult = await db.query(`
    SELECT id, inviter_id, role FROM family_invites
    WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()
  `, [token]);

  const invite = inviteResult.rows[0];
  if (!invite) {
    return res.status(400).json({ error: 'Invalid or expired invite' });
  }

  // Get or create family_group_id
  const inviterResult = await db.query(
    'SELECT family_group_id FROM users WHERE id = $1', [invite.inviter_id]
  );
  let familyGroupId = inviterResult.rows[0]?.family_group_id;

  if (!familyGroupId) {
    const groupResult = await db.query(
      `UPDATE users SET family_group_id = gen_random_uuid() WHERE id = $1 RETURNING family_group_id`,
      [invite.inviter_id]
    );
    familyGroupId = groupResult.rows[0].family_group_id;
  }

  // Link new user to family group
  await db.query(`
    UPDATE users SET family_group_id = $1, role = $2 WHERE id = $3
  `, [familyGroupId, invite.role, newUserId]);

  // Mark invite as accepted
  await db.query(
    'UPDATE family_invites SET accepted_at = NOW() WHERE id = $1',
    [invite.id]
  );

  res.json({ ok: true, family_group_id: familyGroupId });
});
```

**Commit:**
```bash
git add apps/api/src/db/migrations/004_family_invites.sql apps/api/src/routes/family.ts
git commit -m "feat(api): add family invite token generation and accept flow with family_group_id linking"
```

**Update PROGRESS.md:** Check off 5.01 and 5.10. Set Last Completed to "5.10 — family invite system".
