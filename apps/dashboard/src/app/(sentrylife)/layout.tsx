import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireSession } from '@/lib/auth-guard';

export default async function SentryLifeLayout({ children }: { children: ReactNode }) {
  await requireSession();

  return (
    <div className="min-h-screen bg-canvas">
      <nav className="flex h-16 items-center justify-between border-b border-hairline bg-canvas px-6">
        <Link href="/sentrylife/family" className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-sentrylife text-on-primary">
            <ShieldGlyph />
          </span>
          <span className="text-title-md text-body-strong">SentryLife</span>
          <span className="text-caption-uppercase text-muted">Family Security</span>
        </Link>
        <div className="flex items-center gap-2 text-nav-link">
          <Link
            href="/sentrylife/family"
            className="rounded-md px-3 py-2 text-body hover:bg-surface-card hover:text-body-strong"
          >
            Family Hub
          </Link>
          <Link
            href="/sentrylife/home-defense"
            className="rounded-md px-3 py-2 text-body hover:bg-surface-card hover:text-body-strong"
          >
            Home Defense
          </Link>
        </div>
      </nav>
      <main className="px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-[1080px]">{children}</div>
      </main>
    </div>
  );
}

function ShieldGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
