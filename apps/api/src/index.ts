import { receiver, slackApp } from './bots/slack/app'
import './bots/slack/commands/defend'
import './bots/slack/commands/leaderboard'
import './bots/slack/actions/answerHandler'
import { env } from './config/env'
import { logger } from './config/logger'
import { db } from './db/client'
import { redis } from './db/redis'

const app = receiver.app
app.use(require('express').json({ limit: '100kb' }))

app.get('/health', async (_req, res) => {
  const [dbOk, redisOk] = await Promise.all([
    db.query('SELECT 1').then(() => true).catch(() => false),
    redis.ping().then(() => true).catch(() => false),
  ])
  res.json({ status: 'ok', db: dbOk, redis: redisOk })
})

;(async () => {
  await slackApp.start(env.PORT)
  logger.info({ port: env.PORT }, 'DefendDaily API started')
})()

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down')
  await slackApp.stop()
  await redis.quit()
  await db.end()
  process.exit(0)
})
