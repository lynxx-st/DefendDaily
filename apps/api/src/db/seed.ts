import { resolve } from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: resolve(__dirname, '../../../../.env') })

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { Pool } from 'pg'
import pino from 'pino'

const logger = pino({ level: 'info', transport: { target: 'pino-pretty', options: { colorize: true } } })
const pool = new Pool({ connectionString: process.env['DATABASE_URL'] })

const PUZZLE_BANK_ROOT = resolve(__dirname, '../../../../packages/puzzle-bank')

interface PuzzleFile {
  type: 'spot_the_phish' | 'true_false' | 'scenario' | 'breach_alert'
  difficulty: 'easy' | 'medium' | 'hard'
  context_trigger?: string | null
  payload: Record<string, unknown>
  correct_answer: string
  explanation: string
  tags?: string[]
}

function loadPuzzles(): PuzzleFile[] {
  const subdirs = ['true-false', 'scenarios', 'spot-the-phish', 'breach-alert']
  const puzzles: PuzzleFile[] = []

  for (const subdir of subdirs) {
    const dir = join(PUZZLE_BANK_ROOT, subdir)
    let files: string[]
    try {
      files = readdirSync(dir).filter((f) => f.endsWith('.json'))
    } catch {
      logger.warn({ dir }, 'Puzzle bank directory not found, skipping')
      continue
    }

    for (const file of files) {
      const raw = readFileSync(join(dir, file), 'utf-8')
      puzzles.push(JSON.parse(raw) as PuzzleFile)
    }
  }

  return puzzles
}

async function seed() {
  const puzzles = loadPuzzles()
  logger.info({ count: puzzles.length }, 'Loaded puzzles from bank')

  const client = await pool.connect()
  try {
    let inserted = 0
    let skipped = 0

    for (const puzzle of puzzles) {
      const result = await client.query(
        `INSERT INTO puzzles (type, difficulty, context_trigger, payload, correct_answer, explanation, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          puzzle.type,
          puzzle.difficulty,
          puzzle.context_trigger ?? null,
          JSON.stringify(puzzle.payload),
          puzzle.correct_answer,
          puzzle.explanation,
          puzzle.tags ?? [],
        ]
      )

      if (result.rowCount && result.rowCount > 0) {
        inserted++
      } else {
        skipped++
      }
    }

    logger.info({ inserted, skipped }, 'Seed complete')
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch((err) => {
  logger.error(err, 'Seed failed')
  process.exit(1)
})
