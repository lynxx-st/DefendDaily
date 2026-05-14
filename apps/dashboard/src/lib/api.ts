import type {
  ApiError,
  LeaderboardEntry,
  OrgRiskSummary,
  PhishTrendPoint,
  User,
} from '@defenddaily/shared-types';
import type { Session } from 'next-auth';
import { env } from '@/config/env';
import { signApiJwt } from '@/lib/api-jwt';

class DashboardApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    public readonly body: ApiError | null,
  ) {
    super(`API ${status} on ${path}: ${body?.error ?? 'unknown error'}`);
    this.name = 'DashboardApiError';
  }
}

async function apiFetch<T>(path: string, session: Session, init?: RequestInit): Promise<T> {
  const token = await signApiJwt(session);
  const res = await fetch(`${env.API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    let body: ApiError | null = null;
    try {
      body = (await res.json()) as ApiError;
    } catch {
      body = null;
    }
    throw new DashboardApiError(res.status, path, body);
  }
  return (await res.json()) as T;
}

export type CohortRow = {
  cohort: string
  user_count: string
  avg_score: string
  avg_streak: string
  accuracy: string
}

export type BehavioralChange = {
  before: { period: string; avg_score: string; accuracy: string } | undefined
  after: { period: string; avg_score: string; accuracy: string } | undefined
  delta: number | null
}

export type Campaign = {
  id: string
  name: string
  description: string | null
  puzzle_type: string | null
  difficulty: string | null
  dept_filter: string[]
  start_date: string
  end_date: string
  created_at: string
}

export const api = {
  getOrgRiskSummary: (session: Session, orgId: string) =>
    apiFetch<OrgRiskSummary>(`/api/orgs/${orgId}/risk-summary`, session),

  getOrgUsers: (session: Session, orgId: string) =>
    apiFetch<User[]>(`/api/orgs/${orgId}/users`, session),

  getPhishTrend: (session: Session, orgId: string, weeks = 13) =>
    apiFetch<PhishTrendPoint[]>(`/api/orgs/${orgId}/phish-trend?weeks=${weeks}`, session),

  getLeaderboard: (session: Session, orgId: string) =>
    apiFetch<LeaderboardEntry[]>(`/api/orgs/${orgId}/leaderboard`, session),

  getCohorts: (session: Session) =>
    apiFetch<{ cohorts: CohortRow[] }>('/api/analytics/cohorts', session),

  getBehavioralChange: (session: Session, userId: string) =>
    apiFetch<BehavioralChange>(`/api/analytics/behavioral-change/${userId}`, session),

  getCampaigns: (session: Session) =>
    apiFetch<{ campaigns: Campaign[] }>('/api/campaigns', session),

  createCampaign: (session: Session, body: Omit<Campaign, 'id' | 'created_at'>) =>
    apiFetch<{ id: string }>('/api/campaigns', session, { method: 'POST', body: JSON.stringify(body) }),

  getHealthScore: (session: Session) =>
    apiFetch<{ adoption_pct: number; active_7d: number; avg_score: number; renewal_date: string | null }>('/api/analytics/health-score', session),

  getBillingStatus: (session: Session) =>
    apiFetch<{ plan: string; plan_status: string; plan_expires_at: string | null }>('/api/billing/status', session),

  createCheckout: (session: Session, plan: 'growth' | 'enterprise', seatCount: number) =>
    apiFetch<{ url: string }>('/api/billing/checkout', session, {
      method: 'POST',
      body: JSON.stringify({ plan, seat_count: seatCount }),
    }),

  getReferrals: (session: Session) =>
    apiFetch<{ referrals: Array<{ ref_code: string; referred_count: string; paid_count: string }> }>('/api/referrals/stats', session),

  generateReferralCode: (session: Session) =>
    apiFetch<{ code: string; url: string }>('/api/referrals/generate', session, { method: 'POST' }),
};

export { DashboardApiError };
