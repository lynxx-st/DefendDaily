import { requireCisoOrAdmin } from '@/lib/auth-guard'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import Link from 'next/link'

type PuzzleRow = {
  puzzle_id: string
  type: string
  difficulty: string
  total_shown: string
  skip_rate: string
  avg_response_ms: string
  accuracy: string
}

function SkipBadge({ rate }: { rate: number }) {
  if (rate >= 30) return <Badge variant="error">{rate}% skipped</Badge>
  if (rate >= 15) return <Badge variant="warning">{rate}% skipped</Badge>
  return <Badge variant="success">{rate}% skipped</Badge>
}

function AccuracyIcon({ accuracy }: { accuracy: number }) {
  if (accuracy >= 80) return <TrendingUp size={14} className="text-semantic-success" />
  if (accuracy <= 40) return <TrendingDown size={14} className="text-semantic-error" />
  return <Minus size={14} className="text-muted" />
}

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-semantic-success',
  medium: 'text-semantic-warning',
  hard: 'text-semantic-error',
}

export default async function PuzzleEffectivenessPage() {
  await requireCisoOrAdmin()

  let puzzles: PuzzleRow[] = []
  try {
    const data = await api<{ puzzles: PuzzleRow[] }>('/api/analytics/puzzles/engagement', {
      next: { revalidate: 60 },
    })
    puzzles = data.puzzles
  } catch {
    // show empty state
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/puzzles" className="text-muted hover:text-body transition">
          <ArrowLeft size={18} />
        </Link>
        <PageHeader
          title="Puzzle Effectiveness"
          description="30-day engagement, skip rate, and accuracy per puzzle — sorted by delivery volume."
        />
      </div>

      {puzzles.length === 0 ? (
        <Card className="p-12 text-center text-muted">
          No puzzle delivery data yet. Puzzles will appear here once your team starts answering.
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-hairline">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface-card">
                {['ID', 'Type', 'Difficulty', 'Shown', 'Skip rate', 'Avg. time', 'Accuracy'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-muted font-medium text-body-sm">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {puzzles.map(row => {
                const skipRate = parseFloat(row.skip_rate)
                const accuracy = parseFloat(row.accuracy)
                const avgMs = parseInt(row.avg_response_ms, 10)
                const avgSec = isNaN(avgMs) ? '—' : `${(avgMs / 1000).toFixed(1)}s`
                return (
                  <tr key={row.puzzle_id} className="hover:bg-surface-card/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted">{row.puzzle_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-body capitalize">{row.type.replace(/_/g, ' ')}</td>
                    <td className={`px-4 py-3 capitalize font-medium ${DIFFICULTY_COLOR[row.difficulty] ?? 'text-body'}`}>
                      {row.difficulty}
                    </td>
                    <td className="px-4 py-3 text-body tabular-nums">{row.total_shown}</td>
                    <td className="px-4 py-3">
                      <SkipBadge rate={skipRate} />
                    </td>
                    <td className="px-4 py-3 text-body tabular-nums">{avgSec}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AccuracyIcon accuracy={accuracy} />
                        <span className="tabular-nums text-body">{isNaN(accuracy) ? '—' : `${accuracy}%`}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
