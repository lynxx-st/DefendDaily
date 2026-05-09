import { App, ExpressReceiver, type Installation, type InstallationQuery } from '@slack/bolt'
import { db } from '../../db/client'
import { env } from '../../config/env'
import { logger } from '../../config/logger'

export const receiver = new ExpressReceiver({
  signingSecret: env.SLACK_SIGNING_SECRET,
  clientId: env.SLACK_CLIENT_ID,
  clientSecret: env.SLACK_CLIENT_SECRET,
  stateSecret: env.SLACK_STATE_SECRET,
  scopes: ['chat:write', 'commands', 'users:read', 'users:read.email', 'im:write'],
  installationStore: {
    storeInstallation: async (installation: Installation) => {
      const teamId = installation.isEnterpriseInstall
        ? installation.enterprise?.id
        : installation.team?.id
      const teamName = installation.isEnterpriseInstall
        ? (installation.enterprise?.name ?? 'Unknown')
        : (installation.team?.name ?? 'Unknown')
      const botToken = installation.bot?.token ?? null

      await db.query(
        `INSERT INTO organizations (name, slack_team_id, slack_bot_token, slack_installation)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slack_team_id)
         DO UPDATE SET name = EXCLUDED.name,
                       slack_bot_token = EXCLUDED.slack_bot_token,
                       slack_installation = EXCLUDED.slack_installation`,
        [teamName, teamId, botToken, JSON.stringify(installation)]
      )
      logger.info({ teamId }, 'Slack installation stored')
    },

    fetchInstallation: async (query: InstallationQuery<boolean>) => {
      const teamId = query.isEnterpriseInstall ? query.enterpriseId : query.teamId
      const { rows } = await db.query<{ slack_installation: Installation }>(
        'SELECT slack_installation FROM organizations WHERE slack_team_id = $1',
        [teamId]
      )
      const row = rows[0]
      if (!row) throw new Error(`No Slack installation found for team ${teamId}`)
      return row.slack_installation
    },

    deleteInstallation: async (query: InstallationQuery<boolean>) => {
      const teamId = query.isEnterpriseInstall ? query.enterpriseId : query.teamId
      await db.query(
        `UPDATE organizations
         SET slack_bot_token = NULL, slack_installation = NULL
         WHERE slack_team_id = $1`,
        [teamId]
      )
      logger.info({ teamId }, 'Slack installation deleted')
    },
  },
})

export const slackApp = new App({ receiver })
