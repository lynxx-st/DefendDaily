interface BossChallengeOption {
  id: string
  text: string
}

interface BossChallengePayload {
  puzzleId: string
  question: string
  options: BossChallengeOption[]
  endsAt: string
}

export function buildBossChallengeMessage(payload: BossChallengePayload): Record<string, unknown> {
  const endsAt = new Date(payload.endsAt)
  const deadline = `<!date^${Math.floor(endsAt.getTime() / 1000)}^{date_short_pretty} at {time}|${endsAt.toISOString()}>`

  return {
    text: '🔥 BOSS CHALLENGE — 2× points today only!',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '⚔️  BOSS CHALLENGE', emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Today only — 2× points on every correct answer.*\nThe hardest puzzle of the month. Prove you belong on the leaderboard.\n\n⏰ Ends: ${deadline}`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${payload.question}*` },
      },
      {
        type: 'actions',
        elements: payload.options.map(opt => ({
          type: 'button',
          text: { type: 'plain_text', text: opt.text, emoji: true },
          action_id: `boss_answer_${opt.id}`,
          value: JSON.stringify({ puzzleId: payload.puzzleId, answerId: opt.id }),
        })),
      },
    ],
  }
}
