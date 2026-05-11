import { Queue, type ConnectionOptions } from 'bullmq'
import { env } from '../config/env'

const url = new URL(env.REDIS_URL)
export const connection: ConnectionOptions = {
  host: url.hostname,
  port: parseInt(url.port || '6379', 10),
}

const defaultJobOptions = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
}

export const dailyPuzzleQueue = new Queue('daily-puzzle', { connection, defaultJobOptions })
export const riskScoreQueue = new Queue('risk-score', { connection, defaultJobOptions })
export const hibpQueue = new Queue('hibp-check', { connection, defaultJobOptions })
export const guardianAlertQueue = new Queue('guardian-alert', { connection, defaultJobOptions })
export const weeklySummaryQueue = new Queue('weekly-summary', { connection, defaultJobOptions })
export const familyBreachQueue = new Queue('family-breach-monitor', { connection, defaultJobOptions })
