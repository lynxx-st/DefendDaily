CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_score_history_user_date_unique
  ON risk_score_history(user_id, recorded_at);
