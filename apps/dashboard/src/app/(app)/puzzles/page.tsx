import { requireCisoOrAdmin } from '@/lib/auth-guard'
import { PageHeader } from '@/components/ui/PageHeader'
import { PuzzleStudio } from '@/components/puzzles/PuzzleStudio'
import { FileText } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function PuzzleStudioPage() {
  const session = await requireCisoOrAdmin()

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Puzzle Studio"
          description="Create and preview security puzzles before publishing them to your team."
        />
        <Link href="/puzzles/effectiveness">
          <Button variant="outline" size="sm">
            <FileText size={14} />
            Effectiveness Report
          </Button>
        </Link>
      </div>

      <PuzzleStudio orgId={session.user.orgId} />
    </div>
  )
}
