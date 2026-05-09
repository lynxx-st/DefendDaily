# Step 4.03: packages/shared-types

## packages/shared-types/package.json

```json
{
  "name": "@defenddaily/shared-types",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

## packages/shared-types/src/index.ts

```typescript
// Mirror of DB schema — keep in sync with 001_init.sql

export type Organization = {
  id: string;
  name: string;
  slack_team_id: string | null;
  teams_tenant_id: string | null;
  plan: 'starter' | 'growth' | 'enterprise';
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
  role: 'employee' | 'ciso' | 'admin' | 'senior' | 'child';
  provider_id: string | null;
  provider_type: 'slack' | 'teams' | 'web' | null;
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
  type: 'spot_the_phish' | 'true_false' | 'scenario' | 'breach_alert';
  difficulty: 'easy' | 'medium' | 'hard';
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
  status: 'pending' | 'correct' | 'incorrect' | 'skipped' | 'expired';
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
  outcome: 'clicked' | 'reported' | 'ignored' | null;
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

// API response shapes
export type OrgRiskSummary = {
  org_id: string;
  total_users: number;
  avg_score: number;
  departments: DepartmentScore[];
};

export type DepartmentScore = {
  department: string;
  avg_score: number;
  user_count: number;
};

export type PhishTrendPoint = {
  week_start: string;
  sent: number;
  clicked: number;
  reported: number;
  click_rate: number;
};
```

Add to both apps' tsconfig paths and pnpm-workspace:
```json
// apps/api/tsconfig.json and apps/dashboard/tsconfig.json paths:
"@defenddaily/shared-types": ["../../packages/shared-types/src/index.ts"]
```

**Commit:**
```bash
git add packages/shared-types/
git commit -m "feat(packages): add shared-types package with full DB model interfaces and API response types"
```

**Update PROGRESS.md:** Check off 4.03. Set Last Completed to "4.03 — shared-types package".
