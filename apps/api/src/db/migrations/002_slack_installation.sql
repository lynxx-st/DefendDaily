ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS slack_bot_token    TEXT,
  ADD COLUMN IF NOT EXISTS slack_installation JSONB;
