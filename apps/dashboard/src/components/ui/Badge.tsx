import type { ReactNode } from 'react';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-card-elevated text-body-strong',
  primary: 'bg-primary/15 text-primary-glow',
  success: 'bg-semantic-success/15 text-semantic-success',
  warning: 'bg-risk-amber/15 text-risk-amber',
  danger: 'bg-semantic-error/15 text-semantic-error',
};

export function Badge({
  children,
  tone = 'neutral',
  uppercase = true,
  dot = false,
}: {
  children: ReactNode;
  tone?: Tone;
  uppercase?: boolean;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 ${TONE[tone]} ${
        uppercase ? 'text-caption-uppercase' : 'text-caption'
      }`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-pill bg-current" />}
      {children}
    </span>
  );
}
