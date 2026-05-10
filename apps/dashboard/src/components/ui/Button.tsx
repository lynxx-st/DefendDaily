import Link from 'next/link';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-active',
  secondary: 'bg-surface-card-elevated text-body-strong hover:bg-surface-strong',
  outline:
    'bg-transparent text-body-strong border border-hairline-strong hover:bg-surface-card-elevated',
  ghost: 'bg-transparent text-body hover:text-body-strong hover:bg-surface-card',
  danger: 'bg-semantic-error/10 text-semantic-error hover:bg-semantic-error/20',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-body-sm',
  md: 'h-10 px-[18px] text-button',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ComponentPropsWithoutRef<'button'>, keyof CommonProps> & { href?: never };

type ButtonAsLink = CommonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof CommonProps> & { href: string };

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = 'primary', size = 'md', className = '', children, ...rest } = props;
  const cls = `${BASE} ${SIZE[size]} ${VARIANT[variant]} ${className}`;

  if ('href' in rest && rest.href !== undefined) {
    const { href, ...linkRest } = rest as ButtonAsLink;
    return (
      <Link href={href} className={cls} {...linkRest}>
        {children}
      </Link>
    );
  }
  const ButtonEl: ElementType = 'button';
  return (
    <ButtonEl className={cls} {...(rest as ButtonAsButton)}>
      {children}
    </ButtonEl>
  );
}
