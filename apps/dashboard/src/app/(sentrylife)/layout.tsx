import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireSession } from '@/lib/auth-guard';

export default async function SentryLifeLayout({ children }: { children: ReactNode }) {
  await requireSession();

  return (
    <div className="min-h-screen bg-canvas">
      <nav className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-hairline bg-canvas/90 px-6 backdrop-blur-md lg:px-10">
        <Link href="/sentrylife/family" className="flex items-center gap-3">
          <span
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-on-primary"
            style={{
              background:
                'linear-gradient(135deg, #7b3aed 0%, #6429c4 100%)',
              boxShadow: '0 0 0 1px rgba(123,58,237,0.4), 0 0 24px rgba(123,58,237,0.35)',
            }}
          >
            <ShieldGlyph />
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-title-md text-body-strong">SentryLife</span>
            <span className="mt-0.5 text-caption-uppercase text-muted">Family Security</span>
          </div>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          <NavLink href="/sentrylife/family">Family Hub</NavLink>
          <NavLink href="/sentrylife/home-defense">Home Defense</NavLink>
          <span className="mx-3 h-5 w-px bg-hairline" />
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-nav-link text-muted hover:text-body-strong"
          >
            ← Back to CISO
          </Link>
        </div>
      </nav>
      <main className="px-6 py-10 lg:px-10 lg:py-14">
        <div className="mx-auto max-w-[1080px]">{children}</div>
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-nav-link text-body transition-colors hover:bg-surface-card hover:text-body-strong"
    >
      {children}
    </Link>
  );
}

function ShieldGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2.2 2.2L15 10.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
