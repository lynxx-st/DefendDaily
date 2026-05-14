import { BotFrameworkAdapter } from 'botbuilder'
import { env } from '../../config/env'
import { DefendDailyBot } from './bot'
import type { Request, Response } from 'express'
import { logger } from '../../config/logger'

export const teamsAdapter = new BotFrameworkAdapter({
  appId: env.TEAMS_APP_ID ?? '',
  appPassword: env.TEAMS_APP_PASSWORD ?? '',
})

teamsAdapter.onTurnError = async (context, error) => {
  logger.error({ err: error }, 'Teams adapter unhandled error')
  await context.sendActivity('Something went wrong. Please try again.')
}

const bot = new DefendDailyBot()

export function teamsMessageHandler(req: Request, res: Response): void {
  void teamsAdapter.processActivity(req, res, async (context) => {
    await bot.run(context)
  })
}
