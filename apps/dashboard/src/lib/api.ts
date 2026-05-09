import type {
  ApiError,
  LeaderboardEntry,
  OrgRiskSummary,
  PhishTrendPoint,
  User,
} from '@defenddaily/shared-types';
import { env } from '@/config/env';

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

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
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
  getOrgRiskSummary: (orgId: string) =>
    apiFetch<OrgRiskSummary>(`/api/orgs/${orgId}/risk-summary`),

  getOrgUsers: (orgId: string) => apiFetch<User[]>(`/api/orgs/${orgId}/users`),

  getPhishTrend: (orgId: string, weeks = 13) =>
    apiFetch<PhishTrendPoint[]>(`/api/orgs/${orgId}/phish-trend?weeks=${weeks}`),

  getLeaderboard: (orgId: string) =>
    apiFetch<LeaderboardEntry[]>(`/api/orgs/${orgId}/leaderboard`),
};

export { DashboardApiError };
