import axios from 'axios'
import crypto from 'crypto'
import { redis } from '../db/redis'
import { logger } from '../config/logger'

export type BreachEntry = {
  Name: string
  BreachDate: string
  DataClasses: string[]
  Description: string
}

// Telefunc response shape from databreach.com
type DataBreachResponse = {
  result: {
    count: number
    breaches: Array<{
      name: string
      date: string
      data_classes: string[]
      description?: string
    }>
  }
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

  try {
    const response = await axios.post<DataBreachResponse>(
      'https://databreach.com/_telefunc',
      {
        file: '/app/rpc/search.telefunc.ts',
        name: 'public_search_count',
        args: [{ piis: [{ value: email, type: 'email' }] }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DefendDaily-SecurityTraining/1.0',
        },
        timeout: 10_000,
      }
    )

    // Normalise to the same BreachEntry shape the rest of the codebase expects
    const breaches: BreachEntry[] = (response.data.result?.breaches ?? []).map((b) => ({
      Name: b.name,
      BreachDate: b.date,
      DataClasses: b.data_classes,
      Description: b.description ?? '',
    }))

    await redis.set(cacheKey, JSON.stringify(breaches), 'EX', 86400)
    return breaches
  } catch (err: unknown) {
    logger.warn({ err }, 'databreach.com lookup failed — returning empty')
    // Cache empty result briefly to avoid hammering on transient errors
    await redis.set(cacheKey, '[]', 'EX', 3600)
    return []
  }
}
