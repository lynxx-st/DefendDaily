interface PuzzleOption { label: string; value: string }
interface PuzzlePayload { question: string; options: PuzzleOption[]; image_url?: string }

export function buildPuzzleAdaptiveCard(
  puzzle: { id: string; payload: PuzzlePayload; difficulty: string },
  deliveryId: string,
): Record<string, unknown> {
  const diffBadge = ({ easy: 'Easy', medium: 'Medium', hard: 'Hard' } as Record<string, string>)[puzzle.difficulty] ?? puzzle.difficulty

  const body: unknown[] = [
    { type: 'TextBlock', text: 'DefendDaily — Daily Security Challenge', weight: 'Bolder', size: 'Medium', color: 'Accent' },
    { type: 'TextBlock', text: diffBadge, size: 'Small', isSubtle: true },
    { type: 'TextBlock', text: puzzle.payload.question, wrap: true, size: 'Medium', weight: 'Bolder', spacing: 'Medium' },
  ]
  if (puzzle.payload.image_url) {
    body.push({ type: 'Image', url: puzzle.payload.image_url, size: 'Large', horizontalAlignment: 'Center' })
  }

  const actions = puzzle.payload.options.map(opt => ({
    type: 'Action.Submit',
    title: opt.label,
    data: { action: 'puzzle_answer', deliveryId, answerId: opt.value },
  }))

  return {
    type: 'AdaptiveCard',
    version: '1.4',
    body,
    actions,
    fallbackText: `DefendDaily puzzle: ${puzzle.payload.question}`,
  }
}

export function buildAnswerFeedbackCard(
  isCorrect: boolean,
  explanation: string,
  pointsEarned: number,
): Record<string, unknown> {
  return {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      { type: 'TextBlock', text: isCorrect ? 'Correct! ✅' : 'Incorrect ❌', weight: 'Bolder', size: 'Large', color: isCorrect ? 'Good' : 'Attention' },
      { type: 'TextBlock', text: explanation, wrap: true, spacing: 'Medium' },
      { type: 'TextBlock', text: isCorrect ? `+${pointsEarned} points earned` : 'Keep practicing!', isSubtle: true, size: 'Small' },
    ],
    fallbackText: isCorrect ? `Correct! +${pointsEarned} points` : explanation,
  }
}
