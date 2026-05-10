import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import type { Role, User } from '@defenddaily/shared-types';
import { env, hasGoogle, hasMicrosoft } from '@/config/env';

type DefendDailyUser = Pick<User, 'id' | 'org_id' | 'role'>;

async function fetchUserByEmail(email: string): Promise<DefendDailyUser | null> {
  try {
    const url = `${env.API_URL}/api/users/by-email?email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as DefendDailyUser;
  } catch {
    return null;
  }
}

const providers: NextAuthConfig['providers'] = [];

if (hasGoogle) {
  providers.push(
    Google({
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
    }),
  );
}

if (hasMicrosoft) {
  providers.push(
    MicrosoftEntraID({
      clientId: env.AZURE_AD_CLIENT_ID!,
      clientSecret: env.AZURE_AD_CLIENT_SECRET!,
      ...(env.AZURE_AD_TENANT_ID
        ? { issuer: `https://login.microsoftonline.com/${env.AZURE_AD_TENANT_ID}/v2.0` }
        : {}),
    }),
  );
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  trustHost: true,
  providers,
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === 'update' && session?.user) {
        token.userId = session.user.id;
        token.orgId = session.user.orgId;
        token.role = session.user.role;
        return token;
      }
      const email = (user?.email ?? token.email) as string | undefined;
      if (email && !token.userId) {
        const ddUser = await fetchUserByEmail(email);
        if (ddUser) {
          token.userId = ddUser.id;
          token.orgId = ddUser.org_id;
          token.role = ddUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.userId === 'string') session.user.id = token.userId;
      if (typeof token.orgId === 'string') session.user.orgId = token.orgId;
      session.user.role = typeof token.role === 'string' ? (token.role as Role) : 'employee';
      return session;
    },
  },
});

export const availableProviders = {
  google: hasGoogle,
  microsoft: hasMicrosoft,
};
