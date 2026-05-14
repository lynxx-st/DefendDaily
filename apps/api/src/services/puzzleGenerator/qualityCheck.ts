import { logger } from '../../config/logger'
import type { GeneratedPuzzle } from './generate'

interface QualityResult {
  approved: boolean
  reasons: string[]
}

export function checkPuzzleQuality(puzzle: GeneratedPuzzle): QualityResult {
  const reasons: string[] = []

  if (puzzle.explanation.split(/\s+/).length < 50) {
    reasons.push(`Explanation too short: ${puzzle.explanation.split(/\s+/).length} words (min 50)`)
  }
  if (puzzle.options.length < 2) {
    reasons.push(`Fewer than 2 answer options: ${puzzle.options.length}`)
  }
  if (!puzzle.options.some(o => o.value === puzzle.correct_answer)) {
    reasons.push(`Correct answer "${puzzle.correct_answer}" not found in options`)
  }
  if (puzzle.confidence < 0.8) {
    reasons.push(`Confidence too low: ${puzzle.confidence} (min 0.8)`)
  }
  if (puzzle.question.length < 20) {
    reasons.push('Question too short')
  }

  if (reasons.length > 0) {
    logger.warn({ reasons }, 'Puzzle quality check failed')
  }

  return { approved: reasons.length === 0, reasons }
}

export async function generateApprovedPuzzle(
  puzzleType: string,
  context?: string,
  maxAttempts = 3,
): Promise<GeneratedPuzzle | null> {
  const { generatePuzzle } = await import('./generate')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const puzzle = await generatePuzzle(puzzleType, context)
    if (!puzzle) continue
    const quality = checkPuzzleQuality(puzzle)
    if (quality.approved) return puzzle
    logger.info({ attempt, reasons: quality.reasons }, 'Retrying puzzle generation after quality failure')
  }
  logger.warn({ puzzleType, maxAttempts }, 'All puzzle generation attempts failed quality check')
  return null
}
