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
