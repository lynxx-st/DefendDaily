'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { ReactNode } from 'react';

const TABS = [
  { value: 'general', label: 'General' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'billing', label: 'Billing' },
  { value: 'notifications', label: 'Notifications' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

export function SettingsTabs({
  general,
  integrations,
  billing,
  notifications,
}: {
  general: ReactNode;
  integrations: ReactNode;
  billing: ReactNode;
  notifications: ReactNode;
}) {
  const [active, setActive] = useState<TabValue>('general');

  const content: Record<TabValue, ReactNode> = { general, integrations, billing, notifications };

  return (
    <Tabs.Root
      value={active}
      onValueChange={v => setActive(v as TabValue)}
    >
      {/* Tab list with animated underline */}
      <Tabs.List className="relative mb-8 flex items-center gap-1 border-b border-hairline">
        {TABS.map(tab => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className="relative px-4 py-2.5 text-body-sm font-medium text-muted transition-colors hover:text-body-strong focus-visible:outline-none data-[state=active]:text-body-strong"
          >
            {tab.label}
            {active === tab.value && (
              <motion.span
                layoutId="tab-underline"
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] rounded-pill bg-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {/* Tab content with fade transition */}
      {TABS.map(tab => (
        <Tabs.Content key={tab.value} value={tab.value} asChild>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {content[tab.value]}
          </motion.div>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
