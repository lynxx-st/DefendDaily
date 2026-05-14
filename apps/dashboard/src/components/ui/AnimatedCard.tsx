'use client';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type Variant = 'default' | 'elevated' | 'glow';

const BORDER: Record<Variant, string> = {
  default: 'border-hairline',
  elevated: 'border-hairline-strong',
  glow: 'border-primary/30',
};

const HOVER_SHADOW: Record<Variant, string> = {
  default: '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
  elevated: '0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
  glow: '0 8px 32px rgba(0,7,205,0.18), 0 0 0 1px rgba(0,7,205,0.3)',
};

export function AnimatedCard({
  children,
  className = '',
  variant = 'default',
  padding = 'p-5',
}: {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  padding?: string;
}) {
  return (
    <motion.div
      className={`rounded-xl border bg-surface-card ${BORDER[variant]} ${padding} ${className}`}
      whileHover={{
        y: -2,
        boxShadow: HOVER_SHADOW[variant],
        transition: { duration: 0.14, ease: [0.25, 0.1, 0.25, 1] },
      }}
      whileTap={{ y: 0, scale: 0.995 }}
    >
      {children}
    </motion.div>
  );
}

/* Inline hover-lift wrapper — use on any existing card without restructuring */
export function HoverLift({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{
        y: -2,
        transition: { duration: 0.14, ease: [0.25, 0.1, 0.25, 1] },
      }}
    >
      {children}
    </motion.div>
  );
}
