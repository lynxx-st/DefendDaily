import express from 'express'
import { env } from './config/env'
import { logger } from './config/logger'
import { db } from './db/client'
import { redis } from './db/redis'

const app = express()
app.use(express.json({ limit: '100kb' }))

app.get('/health', async (_req, res) => {
  const [dbOk, redisOk] = await Promise.all([
    db.query('SELECT 1').then(() => true).catch(() => false),
    redis.ping().then(() => true).catch(() => false),
  ])
  res.json({ status: 'ok', db: dbOk, redis: redisOk })
})

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API server started')
})

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down')
  server.close()
  await redis.quit()
  await db.end()
  process.exit(0)
})
