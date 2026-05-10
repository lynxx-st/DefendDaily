import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  padding = 'lg',
}: {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const PADDING = { sm: 'p-4', md: 'p-5', lg: 'p-6', xl: 'p-8' } as const;
  return (
    <div
      className={`rounded-xl border border-hairline bg-surface-card ${PADDING[padding]} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-title-md text-body-strong">{title}</h3>
        {description && <p className="mt-1 text-body-sm text-body">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
