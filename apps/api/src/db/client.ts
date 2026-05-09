import { Pool } from 'pg'
import { env } from '../config/env'
import { logger } from '../config/logger'

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.NODE_ENV === 'production' ? 20 : 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

db.on('error', (err) => {
  logger.error({ err }, 'Unexpected pg pool error')
})
