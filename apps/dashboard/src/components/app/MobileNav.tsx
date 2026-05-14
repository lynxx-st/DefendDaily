'use client';
import { useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Users, Mail, FileText, Settings } from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { href: '/team', label: 'Team', Icon: Users },
  { href: '/simulations', label: 'Simulations', Icon: Mail },
  { href: '/compliance', label: 'Compliance', Icon: FileText },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

export function MobileNav({ orgName }: { orgName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-surface-card hover:text-body-strong md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
          <path
            d="M3 5h14M3 10h14M3 15h14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute left-0 top-0 h-full w-72 border-r border-hairline bg-canvas px-6 py-8">
            <p className="mb-6 text-caption-uppercase text-muted">{orgName}</p>
            {NAV.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm text-body hover:bg-surface-card hover:text-body-strong"
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
