import Link from 'next/link';
import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumbs,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: { href?: string; label: string }[];
}) {
  return (
    <header className="mb-8">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-3 flex items-center gap-1.5 text-body-sm text-muted">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-body-strong">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-body-strong">{crumb.label}</span>
              )}
              {i < breadcrumbs.length - 1 && <span className="text-muted-soft">/</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="mb-2 text-caption-uppercase text-muted">{eyebrow}</p>}
          <h1 className="text-display-md font-medium text-body-strong">{title}</h1>
          {description && (
            <p className="mt-2 max-w-2xl text-body-md text-body">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
