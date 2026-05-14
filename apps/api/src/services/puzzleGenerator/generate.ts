import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { env } from '../../config/env'
import { logger } from '../../config/logger'

const GeneratedPuzzleSchema = z.object({
  question: z.string().min(20),
  options: z.array(z.object({ label: z.string(), value: z.string() })).min(2).max(6),
  correct_answer: z.string(),
  explanation: z.string().min(50),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
})

export type GeneratedPuzzle = z.infer<typeof GeneratedPuzzleSchema>

const PROMPT_CACHE = new Map<string, string>()

function loadPrompt(puzzleType: string): string {
  const cached = PROMPT_CACHE.get(puzzleType)
  if (cached) return cached
  const prompt = readFileSync(join(__dirname, 'prompts', `${puzzleType}.txt`), 'utf-8')
  PROMPT_CACHE.set(puzzleType, prompt)
  return prompt
}

export async function generatePuzzle(
  puzzleType: string,
  context?: string,
): Promise<GeneratedPuzzle | null> {
  if (!env.ANTHROPIC_API_KEY) {
    logger.warn('ANTHROPIC_API_KEY not set — AI puzzle generation disabled')
    return null
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  const systemPrompt = loadPrompt(puzzleType)
  const userMessage = context ? `Generate a puzzle about: ${context}` : 'Generate a new puzzle.'

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      logger.warn({ puzzleType }, 'AI response contained no JSON')
      return null
    }

    const parsed = GeneratedPuzzleSchema.safeParse(JSON.parse(jsonMatch[0]))
    if (!parsed.success) {
      logger.warn({ puzzleType, errors: parsed.error.flatten() }, 'AI puzzle failed schema validation')
      return null
    }
    return parsed.data
  } catch (err) {
    logger.error({ err, puzzleType }, 'AI puzzle generation failed')
    return null
  }
}
