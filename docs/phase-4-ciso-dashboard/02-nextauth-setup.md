# Steps 4.02 + 4.12: NextAuth.js Setup + Role Middleware

## Install

```bash
cd apps/dashboard
pnpm add next-auth@beta @auth/core
```

## apps/dashboard/src/auth.ts

```typescript
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import Resend from 'next-auth/providers/resend';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Resend({ from: 'noreply@defenddaily.com' }), // magic link
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // Attach org + role to session from DB
      if (session.user?.email) {
        const user = await fetchUserByEmail(session.user.email);
        session.user.id = user?.id;
        session.user.role = user?.role ?? 'employee';
        session.user.orgId = user?.org_id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});

async function fetchUserByEmail(email: string) {
  const res = await fetch(`${process.env.API_URL}/api/users/by-email?email=${encodeURIComponent(email)}`);
  if (!res.ok) return null;
  return res.json();
}
```

## apps/dashboard/src/app/api/auth/[...nextauth]/route.ts

```typescript
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

## apps/dashboard/src/middleware.ts (Step 4.12 — role guard)

```typescript
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Redirect unauthenticated users to login
  if (!session && !pathname.startsWith('/login') && !pathname.startsWith('/setup')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // CISO-only routes
  const cisoRoutes = ['/compliance', '/simulations', '/team'];
  if (cisoRoutes.some(r => pathname.startsWith(r))) {
    const role = session?.user?.role;
    if (role !== 'ciso' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

**Commit:**
```bash
git add apps/dashboard/src/auth.ts apps/dashboard/src/app/api/ apps/dashboard/src/middleware.ts
git commit -m "feat(dashboard): add NextAuth.js with magic link + Google + Microsoft OAuth and role middleware"
```

**Update PROGRESS.md:** Check off 4.02 and 4.12. Set Last Completed to "4.12 — NextAuth + role middleware".
