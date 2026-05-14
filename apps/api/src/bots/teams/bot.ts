import { ActivityHandler, type TurnContext } from 'botbuilder'
import { db } from '../../db/client'
import { redis } from '../../db/redis'
import { logger } from '../../config/logger'
import { buildPuzzleAdaptiveCard, buildAnswerFeedbackCard } from './cards/puzzleCard'
import { calcPoints } from '../../services/puzzleEngine'
import { selectPuzzle } from '../../services/puzzleEngine'

export class DefendDailyBot extends ActivityHandler {
  constructor() {
    super()
    this.onMessage(async (context, next) => {
      const activity = context.activity
      if ((activity.value as Record<string, unknown> | undefined)?.action === 'puzzle_answer') {
        await this.handlePuzzleAnswer(context)
      } else {
        const text = (activity.text ?? '').trim().toLowerCase()
        if (text.startsWith('/defend')) await this.handleDefend(context)
        else if (text.startsWith('/risk')) await this.handleRisk(context)
        else if (text.startsWith('/leaderboard')) await this.handleLeaderboard(context)
        else if (text.startsWith('/achievements')) await this.handleAchievements(context)
      }
      await next()
    })
  }

  private async handlePuzzleAnswer(context: TurnContext): Promise<void> {
    const { deliveryId, answerId } = context.activity.value as { deliveryId: string; answerId: string }
    const teamsUserId = context.activity.from.id

    const { rows: deliveryRows } = await db.query<{
      puzzle_id: string; status: string; user_id: string; delivered_at: string; difficulty: string
    }>(`
      SELECT pd.puzzle_id, pd.status, pd.user_id, pd.delivered_at, p.difficulty
      FROM puzzle_deliveries pd
      JOIN users u ON u.id = pd.user_id
      JOIN puzzles p ON p.id = pd.puzzle_id
      WHERE pd.id = $1 AND u.provider_id = $2 AND u.provider_type = 'teams'
    `, [deliveryId, teamsUserId])

    const delivery = deliveryRows[0]
    if (!delivery || delivery.status !== 'pending') {
      await context.sendActivity('This puzzle has expired. Your next one arrives tomorrow!')
      return
    }

    const { rows: puzzleRows } = await db.query<{ correct_answer: string; explanation: string }>(
      `SELECT correct_answer, explanation FROM puzzles WHERE id = $1`,
      [delivery.puzzle_id],
    )
    const puzzle = puzzleRows[0]
    if (!puzzle) return

    const isCorrect = answerId === puzzle.correct_answer
    const ageMs = Date.now() - new Date(delivery.delivered_at).getTime()
    const streakKey = `streak:${delivery.user_id}`
    const streak = parseInt((await redis.get(streakKey)) ?? '0', 10)
    const points = calcPoints(isCorrect, delivery.difficulty as 'easy' | 'medium' | 'hard', ageMs, streak)
    const newStreak = isCorrect ? streak + 1 : 0

    await db.query(
      `UPDATE puzzle_deliveries SET status = $1, is_correct = $2, responded_at = NOW(), response_time_ms = $3, points_earned = $4 WHERE id = $5`,
      [isCorrect ? 'correct' : 'incorrect', isCorrect, ageMs, points, deliveryId],
    )
    await redis.set(streakKey, String(newStreak))
    await db.query(`UPDATE users SET streak = $1, last_active_date = CURRENT_DATE WHERE id = $2`, [newStreak, delivery.user_id])

    const card = buildAnswerFeedbackCard(isCorrect, puzzle.explanation, points)
    await context.sendActivity({
      attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }],
    })
    logger.info({ userId: delivery.user_id, isCorrect, points }, 'Teams puzzle answered')
  }

  private async handleDefend(context: TurnContext): Promise<void> {
    const { rows: userRows } = await db.query<{ id: string; org_id: string }>(
      `SELECT id, org_id FROM users WHERE provider_id = $1 AND provider_type = 'teams'`,
      [context.activity.from.id],
    )
    const user = userRows[0]
    if (!user) { await context.sendActivity('Not registered. Ask your admin to set up DefendDaily.'); return }

    const puzzle = await selectPuzzle(user.id, user.org_id)
    if (!puzzle) { await context.sendActivity('No puzzles available right now.'); return }

    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO puzzle_deliveries (user_id, puzzle_id, status) VALUES ($1, $2, 'pending') RETURNING id`,
      [user.id, puzzle.id],
    )
    const deliveryId = rows[0]!.id
    const card = buildPuzzleAdaptiveCard(
      { ...puzzle, payload: puzzle.payload as { question: string; options: Array<{ label: string; value: string }> } },
      deliveryId,
    )
    await context.sendActivity({ attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }] })
  }

  private async handleRisk(context: TurnContext): Promise<void> {
    const { rows } = await db.query<{ risk_score: number; display_name: string | null }>(
      `SELECT risk_score, display_name FROM users WHERE provider_id = $1 AND provider_type = 'teams'`,
      [context.activity.from.id],
    )
    const user = rows[0]
    if (!user) { await context.sendActivity('No account found.'); return }
    const shield = user.risk_score >= 70 ? '🟢' : user.risk_score >= 40 ? '🟡' : '🔴'
    await context.sendActivity(`${shield} ${user.display_name ?? 'Your'} Risk Score: ${user.risk_score}/100`)
  }

  private async handleLeaderboard(context: TurnContext): Promise<void> {
    const { rows: orgRows } = await db.query<{ org_id: string }>(
      `SELECT org_id FROM users WHERE provider_id = $1 AND provider_type = 'teams'`,
      [context.activity.from.id],
    )
    if (!orgRows[0]) return

    const { rows: top } = await db.query<{ display_name: string | null; weekly_pts: string }>(
      `SELECT u.display_name, SUM(pd.points_earned)::text AS weekly_pts
       FROM puzzle_deliveries pd JOIN users u ON u.id = pd.user_id
       WHERE u.org_id = $1 AND pd.delivered_at >= date_trunc('week', CURRENT_DATE)
       GROUP BY u.id, u.display_name ORDER BY weekly_pts DESC LIMIT 10`,
      [orgRows[0].org_id],
    )
    const lines = top.map((r, i) => `${i + 1}. ${r.display_name ?? 'Unknown'} — ${r.weekly_pts} pts`)
    await context.sendActivity('**Weekly Leaderboard**\n\n' + (lines.join('\n') || '_No activity yet._'))
  }

  private async handleAchievements(context: TurnContext): Promise<void> {
    const { rows: userRows } = await db.query<{ id: string }>(
      `SELECT id FROM users WHERE provider_id = $1 AND provider_type = 'teams'`,
      [context.activity.from.id],
    )
    if (!userRows[0]) return

    const { rows, rowCount } = await db.query<{ name: string; icon: string; earned_at: string | null }>(
      `SELECT a.name, a.icon, ua.earned_at
       FROM achievements a LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
       ORDER BY ua.earned_at DESC NULLS LAST LIMIT 20`,
      [userRows[0].id],
    )
    const earned = rows.filter(r => r.earned_at !== null)
    const text = earned.length > 0
      ? earned.map(a => `${a.icon} ${a.name}`).join('\n')
      : 'No achievements yet.'
    await context.sendActivity(`**Achievements (${earned.length}/${rowCount ?? 0})**\n\n${text}`)
  }
}
