CREATE TABLE IF NOT EXISTS training_campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  puzzle_type VARCHAR(50),
  difficulty  VARCHAR(20),
  dept_filter TEXT[] DEFAULT '{}',
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_org_id ON training_campaigns(org_id);
