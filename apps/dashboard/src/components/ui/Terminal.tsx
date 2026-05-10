import type { ReactNode } from 'react';

export function TerminalGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl bg-canvas-deep p-4 md:grid-cols-2 md:gap-4 md:p-8">
      {children}
    </div>
  );
}

export function TerminalPane({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-hairline-soft bg-surface-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-pill bg-semantic-error/60" />
          <span className="h-2.5 w-2.5 rounded-pill bg-risk-amber/60" />
          <span className="h-2.5 w-2.5 rounded-pill bg-semantic-success/60" />
          <span className="ml-2 font-mono text-caption text-muted">{title}</span>
        </div>
        {badge && (
          <span className="rounded-pill bg-surface-card-elevated px-2 py-0.5 text-caption text-muted">
            {badge}
          </span>
        )}
      </div>
      <div className="font-mono text-code text-body">{children}</div>
    </div>
  );
}
