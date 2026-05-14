'use client'

interface SparklineProps {
  scores: number[]
  width?: number
  height?: number
}

export function RiskSparkline({ scores, width = 80, height = 24 }: SparklineProps) {
  if (scores.length < 2) return <span className="text-muted text-xs">—</span>

  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1
  const step = width / (scores.length - 1)

  const points = scores
    .map((s, i) => {
      const x = i * step
      const y = height - ((s - min) / range) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const latest = scores[scores.length - 1] ?? 50
  const stroke = latest >= 70 ? '#33d17a' : latest >= 40 ? '#eab308' : '#ff4d4d'

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
