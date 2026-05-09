import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      role: 'employee' | 'ciso' | 'admin' | 'senior' | 'child';
      orgId?: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    role?: 'employee' | 'ciso' | 'admin' | 'senior' | 'child';
    orgId?: string;
  }
}
