-- Billing columns
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_status VARCHAR(20) DEFAULT 'trialing';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Campaign puzzle assignments (9.06)
CREATE TABLE IF NOT EXISTS campaign_puzzles (
  campaign_id UUID REFERENCES training_campaigns(id) ON DELETE CASCADE,
  puzzle_id   UUID REFERENCES puzzles(id) ON DELETE CASCADE,
  position    SMALLINT DEFAULT 0,
  PRIMARY KEY (campaign_id, puzzle_id)
);

-- Referral program (9.11)
CREATE TABLE IF NOT EXISTS referrals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_org   UUID REFERENCES organizations(id),
  ref_code       VARCHAR(20) UNIQUE NOT NULL,
  referred_org   UUID REFERENCES organizations(id),
  commission_pct SMALLINT DEFAULT 20,
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_org);
CREATE INDEX IF NOT EXISTS idx_campaign_puzzles_campaign ON campaign_puzzles(campaign_id);
