import { SignJWT } from 'jose';
import type { Session } from 'next-auth';
import { env } from '@/config/env';

const TTL_SECONDS = 5 * 60;

export async function signApiJwt(session: Session): Promise<string> {
  const userId = session.user.id;
  const orgId = session.user.orgId;
  const role = session.user.role;
  if (!userId || !orgId || !role) {
    throw new Error('Cannot mint JWT: session is missing userId/orgId/role');
  }
  const secret = new TextEncoder().encode(env.NEXTAUTH_SECRET);
  return new SignJWT({ userId, orgId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret);
}
