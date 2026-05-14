import { db } from '../db/client'

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de'] as const
type Locale = typeof SUPPORTED_LOCALES[number]

function isSupported(locale: string): locale is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
}

interface LocalizedPayload {
  question: string
  options: unknown[]
  explanation: string
  locale: Locale
}

export async function getLocalizedPuzzlePayload(puzzleId: string, userId: string): Promise<LocalizedPayload> {
  const { rows } = await db.query<{
    payload: { question: string; options: unknown[] }
    explanation: string
    translations: Record<string, { question: string; options: unknown[]; explanation: string }> | null
    user_locale: string
  }>(
    `SELECT p.payload, p.explanation, p.translations, u.locale AS user_locale
     FROM puzzles p JOIN users u ON u.id = $2 WHERE p.id = $1`,
    [puzzleId, userId],
  )
  const row = rows[0]
  if (!row) {
    return { question: '', options: [], explanation: '', locale: 'en' }
  }

  const locale = isSupported(row.user_locale) ? row.user_locale : 'en'
  if (locale !== 'en' && row.translations?.[locale]) {
    const t = row.translations[locale]!
    return { question: t.question, options: t.options, explanation: t.explanation, locale }
  }

  return { question: row.payload.question, options: row.payload.options, explanation: row.explanation, locale: 'en' }
}
