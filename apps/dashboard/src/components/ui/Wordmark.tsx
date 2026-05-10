type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, { mark: string; text: string; gap: string }> = {
  sm: { mark: 'h-4 w-4', text: 'text-body-sm', gap: 'gap-2' },
  md: { mark: 'h-5 w-5', text: 'text-title-sm', gap: 'gap-2' },
  lg: { mark: 'h-7 w-7', text: 'text-display-sm', gap: 'gap-3' },
};

export function Wordmark({ size = 'md', muted = false }: { size?: Size; muted?: boolean }) {
  const cls = SIZES[size];
  const tone = muted ? 'text-body' : 'text-body-strong';
  return (
    <span className={`inline-flex items-center ${cls.gap} ${tone} font-medium`}>
      <ShieldMark className={cls.mark} />
      <span className={cls.text}>DefendDaily</span>
    </span>
  );
}

function ShieldMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2L4 5v6.5C4 17 12 22 12 22s8-5 8-10.5V5l-8-3z"
        fill="#0007cd"
        stroke="#1a26ff"
        strokeWidth="0.5"
      />
      <path
        d="M9 12l2.2 2.2L15.5 10"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
