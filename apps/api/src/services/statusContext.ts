import { db } from '../db/client'
import { logger } from '../config/logger'

const STATUS_TRIGGERS = [
  { keywords: ['ooo', 'out of office', 'traveling', 'travel', 'conference'], contextTag: 'travel' as const },
  { keywords: ['wfh', 'working from home', 'remote'],                        contextTag: 'remote' as const },
  { keywords: ['new hire', 'first week', 'just joined'],                     contextTag: 'new_hire' as const },
]

export async function getContextTagForUser(slackUserId: string, _botToken: string): Promise<string | null> {
  try {
    const { slackApp } = await import('../bots/slack/app')
    const profile = await slackApp.client.users.profile.get({ user: slackUserId })
    const statusText = (profile.profile?.status_text ?? '').toLowerCase()
    if (!statusText) return null

    for (const trigger of STATUS_TRIGGERS) {
      if (trigger.keywords.some(kw => statusText.includes(kw))) return trigger.contextTag
    }
  } catch (err) {
    logger.warn({ err, slackUserId }, 'Status context check failed')
  }
  return null
}

export async function selectContextAwarePuzzle(userId: string, contextTag: string | null): Promise<string | null> {
  if (!contextTag) return null
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM puzzles WHERE active = true AND context_trigger = $1 ORDER BY random() LIMIT 1`,
    [contextTag],
  )
  return rows[0]?.id ?? null
}
