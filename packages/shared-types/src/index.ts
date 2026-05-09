export type Role = 'employee' | 'ciso' | 'admin' | 'senior' | 'child';
export type Plan = 'starter' | 'growth' | 'enterprise';
export type ProviderType = 'slack' | 'teams' | 'web';
export type PuzzleType = 'spot_the_phish' | 'true_false' | 'scenario' | 'breach_alert';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type DeliveryStatus = 'pending' | 'correct' | 'incorrect' | 'skipped' | 'expired';
export type PhishOutcome = 'clicked' | 'reported' | 'ignored';

export type Organization = {
  id: string;
  name: string;
  slack_team_id: string | null;
  teams_tenant_id: string | null;
  plan: Plan;
  timezone: string;
  puzzle_time: string;
  peer_phish_enabled: boolean;
  created_at: string;
};

export type User = {
  id: string;
  org_id: string;
  email: string;
  display_name: string | null;
  role: Role;
  provider_id: string | null;
  provider_type: ProviderType | null;
  risk_score: number;
  streak: number;
  longest_streak: number;
  last_active_date: string | null;
  family_group_id: string | null;
  is_peer_phish_target: boolean;
  breach_count: number;
  created_at: string;
};

export type Puzzle = {
  id: string;
  type: PuzzleType;
  difficulty: Difficulty;
  context_trigger: string | null;
  payload: Record<string, unknown>;
  correct_answer: string;
  explanation: string;
  tags: string[];
  active: boolean;
  created_at: string;
};

export type PuzzleDelivery = {
  id: string;
  user_id: string;
  puzzle_id: string;
  delivered_at: string;
  responded_at: string | null;
  is_correct: boolean | null;
  response_time_ms: number | null;
  status: DeliveryStatus;
  points_earned: number;
};

export type PhishCampaign = {
  id: string;
  sender_id: string;
  target_id: string;
  template_id: string;
  tracking_token: string;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  reported_at: string | null;
  outcome: PhishOutcome | null;
};

export type RiskScoreHistory = {
  id: string;
  user_id: string;
  score: number;
  recorded_at: string;
};

export type BreachRecord = {
  id: string;
  user_id: string;
  breach_name: string;
  breach_date: string | null;
  data_classes: string[];
  detected_at: string;
};

export type DepartmentScore = {
  department: string;
  avg_score: number;
  user_count: number;
};

export type OrgRiskSummary = {
  org_id: string;
  total_users: number;
  avg_score: number;
  departments: DepartmentScore[];
};

export type PhishTrendPoint = {
  week_start: string;
  sent: number;
  clicked: number;
  reported: number;
  click_rate: number;
};

export type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  score: number;
};

export type ApiError = {
  error: string;
  code: string;
  requestId: string;
};
