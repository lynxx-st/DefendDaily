# Step 4.08: RiskScoreGauge.tsx

## apps/dashboard/src/components/RiskScoreGauge.tsx

```typescript
type Props = {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
};

function scoreToColor(score: number): { bg: string; text: string; ring: string } {
  if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-500' };
  if (score >= 60) return { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-500' };
  if (score >= 40) return { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-500' };
  return { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-500' };
}

function scoreToShield(score: number): string {
  if (score >= 80) return '🟢';
  if (score >= 60) return '🟡';
  if (score >= 40) return '🟠';
  return '🔴';
}

const SIZE_CLASSES = {
  sm: { outer: 'w-16 h-16', score: 'text-xl', label: 'text-xs' },
  md: { outer: 'w-24 h-24', score: 'text-3xl', label: 'text-sm' },
  lg: { outer: 'w-32 h-32', score: 'text-4xl', label: 'text-base' },
};

export function RiskScoreGauge({ score, label, size = 'md' }: Props) {
  const colors = scoreToColor(score);
  const sizes = SIZE_CLASSES[size];

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizes.outer} ${colors.bg} ring-4 ${colors.ring}
          rounded-full flex flex-col items-center justify-center`}
      >
        <span className={`${sizes.score} font-bold ${colors.text}`}>{score}</span>
        <span className="text-lg">{scoreToShield(score)}</span>
      </div>
      {label && <span className={`${sizes.label} font-medium text-gray-600`}>{label}</span>}
    </div>
  );
}
```

**Commit:**
```bash
git add apps/dashboard/src/components/RiskScoreGauge.tsx
git commit -m "feat(dashboard): add RiskScoreGauge component with color-coded shield"
```

**Update PROGRESS.md:** Check off 4.08. Set Last Completed to "4.08 — RiskScoreGauge.tsx".
