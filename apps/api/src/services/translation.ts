import * as deepl from 'deepl-node'
import { db } from '../db/client'
import { logger } from '../config/logger'
import { env } from '../config/env'

const TARGET_LOCALES: deepl.TargetLanguageCode[] = ['es', 'fr', 'de']

export async function translatePuzzle(puzzleId: string): Promise<void> {
  if (!env.DEEPL_API_KEY) {
    logger.warn('DEEPL_API_KEY not configured — skipping translation')
    return
  }

  const translator = new deepl.Translator(env.DEEPL_API_KEY)
  const { rows } = await db.query<{
    payload: { question: string; options: Array<{ label: string; value: string }> }
    explanation: string
  }>(
    `SELECT payload, explanation FROM puzzles WHERE id = $1`,
    [puzzleId],
  )
  const puzzle = rows[0]
  if (!puzzle) return

  const translations: Record<string, unknown> = {}

  for (const locale of TARGET_LOCALES) {
    try {
      const [questionResult, explanationResult, ...optionResults] = await Promise.all([
        translator.translateText(puzzle.payload.question, null, locale),
        translator.translateText(puzzle.explanation, null, locale),
        ...puzzle.payload.options.map(opt => translator.translateText(opt.label, null, locale)),
      ])

      translations[locale] = {
        question: (questionResult as deepl.TextResult).text,
        explanation: (explanationResult as deepl.TextResult).text,
        options: puzzle.payload.options.map((opt, i) => ({
          label: (optionResults[i] as deepl.TextResult).text,
          value: opt.value,
        })),
      }
    } catch (err) {
      logger.warn({ err, puzzleId, locale }, 'Translation failed for locale')
    }
  }

  await db.query(
    `UPDATE puzzles SET translations = $1 WHERE id = $2`,
    [JSON.stringify(translations), puzzleId],
  )
  logger.info({ puzzleId, locales: Object.keys(translations) }, 'Puzzle translated')
}

export async function translateNewPuzzles(): Promise<void> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM puzzles WHERE active = true AND (translations = '{}' OR translations IS NULL) LIMIT 20`,
  )
  for (const row of rows) {
    await translatePuzzle(row.id)
  }
}
