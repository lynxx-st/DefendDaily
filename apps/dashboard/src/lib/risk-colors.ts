export const RISK_COLORS = {
  green: '#33d17a',
  amber: '#f5a524',
  orange: '#fb923c',
  red: '#ff4d4d',
} as const;

export type RiskBucket = keyof typeof RISK_COLORS;

export function scoreBucket(score: number): RiskBucket {
  if (score >= 80) return 'green';
  if (score >= 60) return 'amber';
  if (score >= 40) return 'orange';
  return 'red';
}

export function bucketBgClass(bucket: RiskBucket): string {
  return `bg-risk-${bucket}`;
}

export function bucketRingClass(bucket: RiskBucket): string {
  return `ring-risk-${bucket}`;
}

export function bucketTextClass(bucket: RiskBucket): string {
  return `text-risk-${bucket}`;
}
