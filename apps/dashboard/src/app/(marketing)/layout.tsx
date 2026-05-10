import type { ReactNode } from 'react';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/Footer';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-canvas">
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  );
}
