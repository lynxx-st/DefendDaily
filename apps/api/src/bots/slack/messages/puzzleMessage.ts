import type { KnownBlock } from '@slack/bolt'

export type PuzzleRow = {
  id: string
  type: 'spot_the_phish' | 'true_false' | 'scenario' | 'breach_alert'
  difficulty: 'easy' | 'medium' | 'hard'
  payload: Record<string, unknown>
  correct_answer: string
  explanation: string
}

const DIFFICULTY_EMOJI: Record<PuzzleRow['difficulty'], string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
}

export function buildPuzzleBlocks(puzzle: PuzzleRow, deliveryId: string): KnownBlock[] {
  return [
    buildHeader(puzzle),
    ...buildContent(puzzle, deliveryId),
    buildFooter(),
  ]
}

function buildHeader(puzzle: PuzzleRow): KnownBlock {
  const emoji = DIFFICULTY_EMOJI[puzzle.difficulty]
  const label = puzzle.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return {
    type: 'header',
    text: { type: 'plain_text', text: `${emoji} Daily Security Puzzle — ${label}` },
  }
}

function buildContent(puzzle: PuzzleRow, deliveryId: string): KnownBlock[] {
  switch (puzzle.type) {
    case 'true_false':     return buildTrueFalse(puzzle.payload, deliveryId)
    case 'spot_the_phish': return buildSpotThePhish(puzzle.payload, deliveryId)
    case 'scenario':       return buildScenario(puzzle.payload, deliveryId)
    case 'breach_alert':   return buildBreachAlert(puzzle.payload, deliveryId)
  }
}

// Slack's ButtonElement typing is deeply nested — cast at the block level, not element level
function btn(label: string, answer: string, deliveryId: string, style?: 'primary' | 'danger') {
  return {
    type: 'button' as const,
    text: { type: 'plain_text' as const, text: label },
    action_id: 'puzzle_answer',
    value: JSON.stringify({ deliveryId, answer }),
    ...(style ? { style } : {}),
  }
}

function buildTrueFalse(payload: Record<string, unknown>, deliveryId: string): KnownBlock[] {
  const question = payload['question'] as string
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `*${question}*` } },
    {
      type: 'actions',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      elements: [btn('✅ True', 'true', deliveryId, 'primary'), btn('❌ False', 'false', deliveryId)] as any,
    },
  ]
}

function buildSpotThePhish(payload: Record<string, unknown>, deliveryId: string): KnownBlock[] {
  const image_url = payload['image_url'] as string
  const question = payload['question'] as string
  const options = payload['options'] as string[]
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `*${question}*` } },
    { type: 'image', image_url, alt_text: 'Suspicious email screenshot' },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { type: 'actions', elements: options.map(o => btn(o, o, deliveryId)) as any },
  ]
}

function buildScenario(payload: Record<string, unknown>, deliveryId: string): KnownBlock[] {
  const question = payload['question'] as string
  const options = payload['options'] as string[]
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `*${question}*` } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { type: 'actions', elements: options.map(o => btn(o, o, deliveryId)) as any },
  ]
}

function buildBreachAlert(payload: Record<string, unknown>, deliveryId: string): KnownBlock[] {
  const breach_name = payload['breach_name'] as string
  const question = payload['question'] as string
  const options = payload['options'] as string[]
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `⚠️ *Breach Alert: ${breach_name}*\n\n${question}` },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { type: 'actions', elements: options.map(o => btn(o, o, deliveryId)) as any },
  ]
}

function buildFooter(): KnownBlock {
  return {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: '⏰ Answer within 24 hours to keep your streak. _DefendDaily_' }],
  }
}
