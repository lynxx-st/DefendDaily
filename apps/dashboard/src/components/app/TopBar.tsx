import Link from 'next/link';
import { Search, Bell } from 'lucide-react';
import type { ReactNode } from 'react';
import { signOut } from '@/auth';
import { Wordmark } from '@/components/ui/Wordmark';

export function TopBar({
  userName,
  userEmail,
  role,
  mobileNav,
}: {
  userName: string | null | undefined;
  userEmail: string | null | undefined;
  role: string;
  mobileNav?: ReactNode;
}) {
  const initials = (userName ?? userEmail ?? 'U')
    .split(/[ @]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('');

  return (
    <header className="flex h-16 items-center justify-between border-b border-hairline bg-canvas px-4 md:px-6">
      <div className="flex items-center gap-3">
        {mobileNav}
        <Link href="/dashboard" className="md:hidden">
          <Wordmark size="sm" />
        </Link>
        <div className="hidden items-center gap-2 rounded-md bg-surface-card px-3 md:flex lg:flex">
          <Search size={14} className="text-muted" />
          <input
            type="search"
            placeholder="Search users, puzzles, campaigns…"
            className="h-9 w-72 bg-transparent text-body-sm text-body-strong placeholder:text-muted-soft focus:outline-none"
          />
          <kbd className="rounded-sm bg-surface-card-elevated px-1.5 py-0.5 font-mono text-caption text-muted">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative grid h-9 w-9 place-items-center rounded-md text-body hover:bg-surface-card hover:text-body-strong"
          aria-label="Notifications"
        >
          <Bell size={16} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-pill bg-primary-glow" />
        </button>

        <div className="flex items-center gap-3 rounded-md border border-hairline bg-surface-card px-2 py-1.5">
          <span className="grid h-7 w-7 place-items-center rounded-pill bg-primary/20 text-caption font-semibold text-primary-glow">
            {initials}
          </span>
          <div className="hidden text-right sm:block">
            <p className="text-body-sm font-medium text-body-strong leading-none">
              {userName ?? userEmail}
            </p>
            <p className="text-caption capitalize text-muted leading-tight">{role}</p>
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
          >
            <button
              type="submit"
              className="rounded-sm px-2 text-caption text-muted hover:text-body-strong"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
