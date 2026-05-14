CREATE TABLE IF NOT EXISTS achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(100) UNIQUE NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  icon        VARCHAR(20) NOT NULL,
  category    VARCHAR(50) NOT NULL, -- streak | accuracy | speed | social | milestone
  threshold   INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id),
  earned_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

INSERT INTO achievements (slug, name, description, icon, category, threshold) VALUES
  ('first_blood',     'First Blood',       'Answer your very first puzzle correctly.',                   '🩸', 'milestone', 1),
  ('streak_7',        'Week Warrior',      'Maintain a 7-day answer streak.',                           '🔥', 'streak',    7),
  ('streak_30',       'Month of Mastery',  'Maintain a 30-day answer streak.',                          '🏆', 'streak',    30),
  ('streak_100',      'Century Defender',  'Maintain a 100-day answer streak.',                         '💎', 'streak',    100),
  ('speed_demon',     'Speed Demon',       'Answer a puzzle correctly in under 10 seconds.',            '⚡', 'speed',     NULL),
  ('sharpshooter',    'Sharpshooter',      'Answer 10 puzzles correctly in a row.',                     '🎯', 'accuracy',  10),
  ('centurion',       'Centurion',         'Complete 100 puzzles total.',                               '💯', 'milestone', 100),
  ('five_hundred',    'Five Hundred',      'Complete 500 puzzles total.',                               '🛡️', 'milestone', 500),
  ('phish_spotter',   'Phish Spotter',     'Ace 25 spot-the-phish puzzles.',                           '🎣', 'accuracy',  25),
  ('breach_hunter',   'Breach Hunter',     'Complete 10 breach-alert puzzles.',                         '🔍', 'accuracy',  10),
  ('defender',        'Defender',          'Report a phishing simulation before clicking.',             '🛡️', 'social',    NULL),
  ('challenger',      'Challenger',        'Win a head-to-head puzzle challenge.',                      '⚔️', 'social',    NULL),
  ('mentor',          'Mentor',            'Send a challenge to 5 different colleagues.',               '👨‍🏫', 'social',   5),
  ('night_owl',       'Night Owl',         'Answer a puzzle after 10 PM local time.',                   '🦉', 'milestone', NULL),
  ('early_bird',      'Early Bird',        'Answer a puzzle before 7 AM local time.',                   '🌅', 'milestone', NULL),
  ('perfect_week',    'Perfect Week',      'Answer every puzzle correctly for 7 consecutive days.',     '⭐', 'accuracy',  NULL),
  ('risk_reducer',    'Risk Reducer',      'Raise your Risk Score by 20+ points in 30 days.',          '📈', 'milestone', NULL),
  ('freeze_survivor', 'Freeze Survivor',   'Use a streak freeze and continue your streak.',             '🧊', 'streak',    NULL)
ON CONFLICT (slug) DO NOTHING;
