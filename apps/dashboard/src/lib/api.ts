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

export const api = {
  getOrgRiskSummary: (session: Session, orgId: string) =>
    apiFetch<OrgRiskSummary>(`/api/orgs/${orgId}/risk-summary`, session),

  getOrgUsers: (session: Session, orgId: string) =>
    apiFetch<User[]>(`/api/orgs/${orgId}/users`, session),

  getPhishTrend: (session: Session, orgId: string, weeks = 13) =>
    apiFetch<PhishTrendPoint[]>(`/api/orgs/${orgId}/phish-trend?weeks=${weeks}`, session),

  getLeaderboard: (session: Session, orgId: string) =>
    apiFetch<LeaderboardEntry[]>(`/api/orgs/${orgId}/leaderboard`, session),
};

export { DashboardApiError };
