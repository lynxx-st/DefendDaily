// Run with: pnpm tsx apps/api/src/db/seeds/enrichExplanations.ts
import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '../client'
import { env } from '../../config/env'

if (!env.ANTHROPIC_API_KEY) {
  process.stderr.write('ANTHROPIC_API_KEY not set\n')
  process.exit(1)
}

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

void (async () => {
  const { rows: puzzles } = await db.query<{
    id: string
    payload: { question: string }
    explanation: string
  }>(
    `SELECT id, payload, explanation FROM puzzles WHERE char_length(explanation) < 200 LIMIT 100`,
  )

  let enriched = 0
  for (const puzzle of puzzles) {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: 'You are a security awareness trainer. Expand the following security puzzle explanation to at least 150 words. Include: what the red flag is, why attackers use this technique, real-world examples, and 2-3 specific prevention tips. Return only the expanded explanation text.',
      messages: [{ role: 'user', content: `Original question: ${puzzle.payload.question}\n\nOriginal explanation: ${puzzle.explanation}` }],
    })

    const newExplanation = message.content[0]?.type === 'text' ? message.content[0].text : ''
    if (newExplanation.length > puzzle.explanation.length) {
      await db.query(`UPDATE puzzles SET explanation = $1 WHERE id = $2`, [newExplanation, puzzle.id])
      enriched++
    }
  }

  process.stdout.write(`Enriched ${enriched} of ${puzzles.length} puzzles\n`)
  await db.end()
})()
