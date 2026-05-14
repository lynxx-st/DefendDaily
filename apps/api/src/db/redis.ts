import Redis from 'ioredis'
import { env } from '../config/env'
import { logger } from '../config/logger'

const url = new URL(env.REDIS_URL)

export const redis = new Redis({
  host: url.hostname,
  port: parseInt(url.port || '6379', 10),
  username: url.username || undefined,
  password: url.password ? decodeURIComponent(url.password) : undefined,
  tls: url.protocol === 'rediss:' ? {} : undefined,
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
