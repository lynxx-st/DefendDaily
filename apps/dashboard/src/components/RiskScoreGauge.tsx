import { bucketRingClass, bucketTextClass, scoreBucket } from '@/lib/risk-colors';

type Size = 'sm' | 'md' | 'lg';

type Props = {
  score: number;
  label?: string;
  size?: Size;
};

const SIZE_CLASSES: Record<Size, { outer: string; score: string; label: string }> = {
  sm: { outer: 'h-16 w-16', score: 'text-title-md', label: 'text-caption' },
  md: { outer: 'h-24 w-24', score: 'text-display-md', label: 'text-body-sm' },
  lg: { outer: 'h-32 w-32', score: 'text-display-lg', label: 'text-body-md' },
};

export function RiskScoreGauge({ score, label, size = 'md' }: Props) {
  const bucket = scoreBucket(score);
  const sizeCls = SIZE_CLASSES[size];

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div
        className={`${sizeCls.outer} ${bucketRingClass(bucket)} bg-surface-card-elevated
          flex flex-col items-center justify-center rounded-full ring-4`}
      >
        <span className={`${sizeCls.score} ${bucketTextClass(bucket)} font-medium leading-none`}>
          {score}
        </span>
      </div>
      {label && <span className={`${sizeCls.label} text-muted font-medium`}>{label}</span>}
    </div>
  );
}
