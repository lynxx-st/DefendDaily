import { readFileSync } from 'fs'
import { join } from 'path'
import { Pool } from 'pg'
import dotenv from 'dotenv'
import { resolve } from 'path'
// .env lives at the monorepo root, two levels up from apps/api
dotenv.config({ path: resolve(__dirname, '../../../../.env') })

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] })

const migrations = [
  '001_init.sql',
  '002_slack_installation.sql',
  '003_breach_records_unique.sql',
  '004_risk_history_unique.sql',
  '005_phish_templates_unique.sql',
]

async function migrate() {
  const client = await pool.connect()
  try {
    // Ensure tracking table exists before anything else
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    for (const filename of migrations) {
      const { rows } = await client.query(
        'SELECT filename FROM schema_migrations WHERE filename = $1',
        [filename]
      )
      if (rows.length > 0) {
        console.log(`Skipping ${filename} (already applied)`)
        continue
      }

      const sql = readFileSync(join(__dirname, 'migrations', filename), 'utf8')
      await client.query('BEGIN')
      await client.query(sql)
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [filename]
      )
      await client.query('COMMIT')
      console.log(`Applied ${filename}`)
    }

    console.log('Migrations complete')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined)
    console.error('Migration failed:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
