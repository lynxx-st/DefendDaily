import { redis } from '../db/redis'

// Grant 1 freeze token on every 7-day streak milestone, capped at 3
export async function maybeGrantFreezeToken(userId: string, streakDays: number): Promise<boolean> {
  if (streakDays > 0 && streakDays % 7 === 0) {
    const key = `streak_freeze:${userId}`
    const current = await redis.get(key)
    if (!current || parseInt(current, 10) < 3) {
      await redis.incr(key)
      await redis.expire(key, 90 * 86400)
      return true
    }
  }
  return false
}
