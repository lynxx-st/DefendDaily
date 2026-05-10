type Size = 'md' | 'lg' | 'xl';

const SIZES: Record<Size, string> = {
  md: 'w-[640px] h-[640px]',
  lg: 'w-[960px] h-[960px]',
  xl: 'w-[1280px] h-[1280px]',
};

export function Spotlight({ size = 'lg', className = '' }: { size?: Size; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${SIZES[size]} ${className}`}
      style={{
        background:
          'radial-gradient(closest-side, rgba(26,38,255,0.30) 0%, rgba(26,38,255,0.12) 28%, rgba(0,7,205,0.04) 55%, transparent 75%)',
      }}
    />
  );
}

export function GridDecoration({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(34,34,34,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,34,34,0.5) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
      }}
    />
  );
}
