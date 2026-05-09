import axios from 'axios'
import crypto from 'crypto'
import { redis } from '../db/redis'
import { env } from '../config/env'
import { logger } from '../config/logger'

type BreachEntry = {
  Name: string
  BreachDate: string
  DataClasses: string[]
  Description: string
}

function emailCacheKey(email: string): string {
  const hash = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
  return `hibp:${hash.substring(0, 16)}`
}

export async function checkEmailBreaches(email: string): Promise<BreachEntry[]> {
  const cacheKey = emailCacheKey(email)
  const cached = await redis.get(cacheKey)
  if (cached !== null) {
    return JSON.parse(cached) as BreachEntry[]
  }

  if (!env.HIBP_API_KEY) {
    logger.warn('HIBP_API_KEY not set — skipping breach check')
    return []
  }

  try {
    const response = await axios.get<BreachEntry[]>(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`,
      {
        headers: {
          'hibp-api-key': env.HIBP_API_KEY,
          'User-Agent': 'DefendDaily-SecurityTraining/1.0',
        },
        params: { truncateResponse: false },
        timeout: 10_000,
      }
    )

    const breaches = response.data
    await redis.set(cacheKey, JSON.stringify(breaches), 'EX', 86400)
    return breaches
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      // 404 from HIBP = no breaches found — cache the empty result too
      await redis.set(cacheKey, '[]', 'EX', 86400)
      return []
    }
    throw err
  }
}
