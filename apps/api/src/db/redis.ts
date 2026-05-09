import Redis from 'ioredis'
import { env } from '../config/env'
import { logger } from '../config/logger'

export const redis = new Redis(env.REDIS_URL, {
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3_000),
  lazyConnect: false,
})

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error')
})

redis.on('ready', () => {
  logger.info('Redis connected')
})
