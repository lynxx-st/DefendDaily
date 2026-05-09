CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               VARCHAR(255) NOT NULL,
  slack_team_id      VARCHAR(100) UNIQUE,
  teams_tenant_id    VARCHAR(100) UNIQUE,
  plan               VARCHAR(50) DEFAULT 'starter',
  timezone           VARCHAR(100) DEFAULT 'UTC',
  puzzle_time        TIME DEFAULT '09:00:00',
  peer_phish_enabled BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email                VARCHAR(255) NOT NULL,
  display_name         VARCHAR(255),
  role                 VARCHAR(50) DEFAULT 'employee',
  provider_id          VARCHAR(100),
  provider_type        VARCHAR(20),
  risk_score           SMALLINT DEFAULT 75,
  streak               INT DEFAULT 0,
  longest_streak       INT DEFAULT 0,
  last_active_date     DATE,
  family_group_id      UUID,
  is_peer_phish_target BOOLEAN DEFAULT false,
  hibp_last_checked    TIMESTAMPTZ,
  breach_count         SMALLINT DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email)
);

CREATE TABLE IF NOT EXISTS puzzles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            VARCHAR(50) NOT NULL,
  difficulty      VARCHAR(20) DEFAULT 'medium',
  context_trigger VARCHAR(50),
  payload         JSONB NOT NULL,
  correct_answer  VARCHAR(100) NOT NULL,
  explanation     TEXT NOT NULL,
  tags            TEXT[],
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS puzzle_deliveries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id        UUID REFERENCES puzzles(id),
  delivered_at     TIMESTAMPTZ DEFAULT NOW(),
  responded_at     TIMESTAMPTZ,
  is_correct       BOOLEAN,
  response_time_ms INT,
  status           VARCHAR(20) DEFAULT 'pending',
  points_earned    INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS phish_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       UUID REFERENCES users(id),
  target_id       UUID REFERENCES users(id),
  template_id     UUID,
  tracking_token  VARCHAR(64) UNIQUE NOT NULL,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  opened_at       TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  reported_at     TIMESTAMPTZ,
  outcome         VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS phish_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  subject    VARCHAR(500),
  body_html  TEXT NOT NULL,
  lure_type  VARCHAR(50),
  difficulty VARCHAR(20) DEFAULT 'medium',
  active     BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS risk_score_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  score       SMALLINT NOT NULL,
  recorded_at DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS breach_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  breach_name VARCHAR(255) NOT NULL,
  breach_date DATE,
  data_classes TEXT[],
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS canary_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  token_id     VARCHAR(100) UNIQUE NOT NULL,
  file_type    VARCHAR(50),
  description  VARCHAR(255),
  triggered_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  org_id      UUID,
  user_id     UUID,
  action      VARCHAR(100) NOT NULL,
  metadata    JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_deliveries_user_id ON puzzle_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_deliveries_delivered_at ON puzzle_deliveries(delivered_at);
CREATE INDEX IF NOT EXISTS idx_phish_campaigns_target_id ON phish_campaigns(target_id);
CREATE INDEX IF NOT EXISTS idx_risk_score_history_user_date ON risk_score_history(user_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON audit_log(org_id, occurred_at);
