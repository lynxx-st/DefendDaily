ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS elo_rating SMALLINT DEFAULT 1200;
ALTER TABLE users ADD COLUMN IF NOT EXISTS elo_level SMALLINT DEFAULT 1200;
CREATE INDEX IF NOT EXISTS idx_puzzles_elo ON puzzles(elo_rating);

CREATE TABLE IF NOT EXISTS puzzle_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_group   VARCHAR(100) NOT NULL,
  variant_label   VARCHAR(10) NOT NULL,
  puzzle_id       UUID REFERENCES puzzles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(variant_group, variant_label)
);

CREATE TABLE IF NOT EXISTS ab_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_group   VARCHAR(100) NOT NULL,
  variant_label   VARCHAR(10) NOT NULL,
  user_id         UUID REFERENCES users(id),
  is_correct      BOOLEAN NOT NULL,
  response_time_ms INT,
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS puzzle_suggestions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_slack_id  VARCHAR(100) NOT NULL,
  scenario            TEXT NOT NULL,
  correct_action      TEXT NOT NULL,
  status              VARCHAR(20) DEFAULT 'pending',
  reviewed_by         UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
