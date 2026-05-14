import type { ReactNode } from 'react';
import { requireSession } from '@/lib/auth-guard';
import { Sidebar } from '@/components/app/Sidebar';
import { TopBar } from '@/components/app/TopBar';
import { MobileNav } from '@/components/app/MobileNav';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const orgName = `Org ${session.user.orgId.slice(0, 8)}`;

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar orgName={orgName} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar
          userName={session.user.name}
          userEmail={session.user.email}
          role={session.user.role}
          mobileNav={<MobileNav orgName={orgName} />}
        />
        <main id="main-content" className="flex-1 px-6 py-8 lg:px-10">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
