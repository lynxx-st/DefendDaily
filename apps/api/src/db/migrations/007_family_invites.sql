-- Family invite tokens: lets an employee link a SentryLife family member
-- (senior or child) into a shared family_group_id. Tokens are random hex,
-- single-use (accepted_at sets), 7-day TTL.

CREATE TABLE IF NOT EXISTS family_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         VARCHAR(64) UNIQUE NOT NULL,
  email         VARCHAR(255),
  role          VARCHAR(20) NOT NULL DEFAULT 'senior' CHECK (role IN ('senior', 'child')),
  accepted_at   TIMESTAMPTZ,
  accepted_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_invites_token ON family_invites(token);
CREATE INDEX IF NOT EXISTS idx_family_invites_inviter ON family_invites(inviter_id);
