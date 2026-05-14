ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS leitner_box SMALLINT DEFAULT 1 CHECK (leitner_box BETWEEN 1 AND 5);

CREATE TABLE IF NOT EXISTS user_puzzle_state (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id        UUID REFERENCES puzzles(id) ON DELETE CASCADE,
  leitner_box      SMALLINT DEFAULT 1 CHECK (leitner_box BETWEEN 1 AND 5),
  next_review_date DATE DEFAULT CURRENT_DATE,
  last_answered_at TIMESTAMPTZ,
  UNIQUE(user_id, puzzle_id)
);

CREATE INDEX IF NOT EXISTS idx_user_puzzle_state_review ON user_puzzle_state(user_id, next_review_date);
