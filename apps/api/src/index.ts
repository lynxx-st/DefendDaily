import { receiver, slackApp } from './bots/slack/app'
import { webhooksRouter } from './routes/webhooks'
import { orgsRouter } from './routes/orgs'
import { complianceRouter } from './routes/compliance'
import { usersRouter } from './routes/users'
import { familyRouter } from './routes/family'
import './bots/slack/commands/defend'
import './bots/slack/commands/leaderboard'
import './bots/slack/commands/risk'
import './bots/slack/commands/phishAFriend'
import './bots/slack/commands/reportPhish'
import './bots/slack/commands/achievements'
import './bots/slack/commands/freeze'
import './bots/slack/commands/deptLeaderboard'
import './bots/slack/commands/stats'
import './bots/slack/commands/challenge'
import './bots/slack/commands/adminReport'
import './bots/slack/commands/sendNow'
import './bots/slack/commands/suggestPuzzle'
import './bots/slack/actions/answerHandler'
import './bots/slack/actions/phishSendHandler'
import { scheduleDailyPuzzleJob } from './jobs/dailyPuzzle'
import { scheduleHibpJob } from './jobs/hibpCheck'
import { scheduleRiskScoreJob } from './jobs/riskScore'
import { scheduleWeeklySummaryJob } from './jobs/weeklySummary'
import { scheduleGuardianAlertJob } from './jobs/guardianAlert'
import { scheduleFamilyBreachJob } from './jobs/familyBreachMonitor'
import { scheduleBossChallengeJob, bossChallengeWorker } from './jobs/bossChallenge'
import { schedulePuzzleReminderJob, reminderWorker } from './jobs/puzzleReminder'
import { scheduleWeeklyDigestJob, weeklyDigestWorker } from './jobs/weeklyDigest'
import { scheduleCisaKevJob, cisaKevWorker } from './jobs/cisaKevSync'
import { schedulePuzzleRetirementJob, retirementWorker } from './jobs/puzzleRetirement'
import { puzzleAnalyticsRouter } from './routes/puzzleAnalytics'
import { weaknessMapRouter } from './routes/weaknessMap'
import { puzzlesRouter } from './routes/puzzles'
import { teamsMessageHandler } from './bots/teams/adapter'
import { env } from './config/env'
import { logger } from './config/logger'
import { db } from './db/client'
import { redis } from './db/redis'

const app = receiver.app
// eslint-disable-next-line @typescript-eslint/no-var-requires
app.use(require('express').json({ limit: '100kb' }))
app.use('/', webhooksRouter)
app.use('/api/orgs', orgsRouter)
app.use('/api/compliance', complianceRouter)
app.use('/api/users', usersRouter)
app.use('/api/family', familyRouter)
app.use('/api/analytics/puzzles', puzzleAnalyticsRouter)
app.use('/api/weakness', weaknessMapRouter)
app.use('/api/puzzles', puzzlesRouter)

app.post('/api/teams/messages', teamsMessageHandler)

app.get('/health', async (_req, res) => {
  const [dbOk, redisOk] = await Promise.all([
    db.query('SELECT 1').then(() => true).catch(() => false),
    redis.ping().then(() => true).catch(() => false),
  ])
  res.json({ status: 'ok', db: dbOk, redis: redisOk })
})

;(async () => {
  await slackApp.start(env.PORT)
  await scheduleDailyPuzzleJob()
  await scheduleHibpJob()
  await scheduleRiskScoreJob()
  await scheduleWeeklySummaryJob()
  await scheduleGuardianAlertJob()
  await scheduleFamilyBreachJob()
  await scheduleBossChallengeJob()
  await schedulePuzzleReminderJob()
  await scheduleWeeklyDigestJob()
  await scheduleCisaKevJob()
  await schedulePuzzleRetirementJob()
  logger.info({ port: env.PORT }, 'DefendDaily API started')
})()

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down')
  await slackApp.stop()
  await bossChallengeWorker.close()
  await reminderWorker.close()
  await weeklyDigestWorker.close()
  await cisaKevWorker.close()
  await retirementWorker.close()
  await redis.quit()
  await db.end()
  process.exit(0)
})
