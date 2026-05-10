import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import type { Role } from '@defenddaily/shared-types';
import { auth } from '@/auth';

export type AuthorizedSession = Session & { user: { id: string; orgId: string; role: Role } };

const ELEVATED: Role[] = ['ciso', 'admin'];

function isAuthorized(session: Session | null): session is AuthorizedSession {
  return Boolean(
    session?.user &&
      typeof session.user.id === 'string' &&
      typeof session.user.orgId === 'string' &&
      session.user.role,
  );
}

export async function requireSession(): Promise<AuthorizedSession> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!isAuthorized(session)) redirect('/setup');
  return session;
}

export async function requireCisoOrAdmin(): Promise<AuthorizedSession> {
  const session = await requireSession();
  if (!ELEVATED.includes(session.user.role)) redirect('/');
  return session;
}

export type RouteAuthResult =
  | { ok: true; session: AuthorizedSession }
  | { ok: false; status: 401 | 403; reason: string };

export async function authorizeCisoOrAdmin(): Promise<RouteAuthResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, status: 401, reason: 'unauthenticated' };
  if (!isAuthorized(session)) return { ok: false, status: 403, reason: 'incomplete_session' };
  if (!ELEVATED.includes(session.user.role)) {
    return { ok: false, status: 403, reason: 'role_required:ciso|admin' };
  }
  return { ok: true, session };
}
