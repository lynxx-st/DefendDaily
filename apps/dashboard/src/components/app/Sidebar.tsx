'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  Settings,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/ui/Wordmark';

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: string;
};

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { href: '/team', label: 'Team', icon: <Users size={16} /> },
  { href: '/simulations', label: 'Simulations', icon: <Mail size={16} /> },
  { href: '/compliance', label: 'Compliance', icon: <FileText size={16} /> },
  { href: '/settings', label: 'Settings', icon: <Settings size={16} /> },
];

export function Sidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-hairline bg-canvas md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-hairline px-5">
        <Link href="/dashboard" className="hover:opacity-90">
          <Wordmark size="md" />
        </Link>
      </div>

      <div className="border-b border-hairline px-5 py-4">
        <p className="text-caption-uppercase text-muted">Organization</p>
        <p className="mt-1 truncate text-body-sm font-medium text-body-strong">{orgName}</p>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV.map(item => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-body-sm transition-colors ${
                active
                  ? 'bg-surface-card-elevated text-body-strong'
                  : 'text-body hover:bg-surface-card hover:text-body-strong'
              }`}
            >
              <span className={active ? 'text-primary-glow' : 'text-muted'}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="rounded-pill bg-primary/15 px-1.5 py-0.5 text-caption text-primary-glow">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-hairline px-5 py-4">
        <div className="flex items-center gap-2 text-caption text-muted">
          <ShieldCheck size={14} className="text-semantic-success" />
          All systems operational
        </div>
      </div>
    </aside>
  );
}
