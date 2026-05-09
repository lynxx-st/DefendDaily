import type { DefaultSession } from 'next-auth';
import type { Role } from '@defenddaily/shared-types';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      role: Role;
      orgId?: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    role?: Role;
    orgId?: string;
  }
}
