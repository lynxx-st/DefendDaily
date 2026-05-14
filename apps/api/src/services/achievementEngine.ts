import { db } from '../db/client';
import { logger } from '../config/logger';

export interface AchievementContext {
  userId: string;
  orgId: string;
  isCorrect: boolean;
  responseTimeMs: number;
  puzzleType: string;
  streak: number;
  totalCorrect: number;
  totalDeliveries: number;
  localHour: number;
}

interface AchievementRow {
  id: string;
  slug: string;
  name: string;
  icon: string;
  threshold: number | null;
}

export interface GrantedAchievement {
  slug: string;
  name: string;
  icon: string;
}

export async function checkAndGrantAchievements(
  ctx: AchievementContext,
): Promise<GrantedAchievement[]> {
  const { rows: unearned } = await db.query<AchievementRow>(`
    SELECT a.id, a.slug, a.name, a.icon, a.threshold
    FROM achievements a
    WHERE NOT EXISTS (
      SELECT 1 FROM user_achievements ua
      WHERE ua.user_id = $1 AND ua.achievement_id = a.id
    )
  `, [ctx.userId]);

  const toGrant = unearned.filter(a => isEligible(a, ctx));
  if (toGrant.length === 0) return [];

  // Parameterized batch insert — one row per achievement
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const a of toGrant) {
      await client.query(
        `INSERT INTO user_achievements (user_id, achievement_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, achievement_id) DO NOTHING`,
        [ctx.userId, a.id],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, userId: ctx.userId }, 'achievement grant failed');
    return [];
  } finally {
    client.release();
  }

  logger.info({ userId: ctx.userId, granted: toGrant.map(a => a.slug) }, 'achievements granted');
  return toGrant.map(({ slug, name, icon }) => ({ slug, name, icon }));
}

function isEligible(a: AchievementRow, ctx: AchievementContext): boolean {
  switch (a.slug) {
    case 'first_blood':
      return ctx.isCorrect && ctx.totalCorrect === 1;
    case 'streak_7':
      return ctx.streak >= 7;
    case 'streak_30':
      return ctx.streak >= 30;
    case 'streak_100':
      return ctx.streak >= 100;
    case 'speed_demon':
      return ctx.isCorrect && ctx.responseTimeMs < 10_000;
    case 'sharpshooter':
      return ctx.isCorrect && ctx.totalCorrect >= 10;
    case 'centurion':
      return ctx.totalDeliveries >= 100;
    case 'five_hundred':
      return ctx.totalDeliveries >= 500;
    case 'phish_spotter':
      return ctx.isCorrect && ctx.puzzleType === 'spot_the_phish' && ctx.totalCorrect >= 25;
    case 'breach_hunter':
      return ctx.isCorrect && ctx.puzzleType === 'breach_alert' && ctx.totalCorrect >= 10;
    case 'night_owl':
      return ctx.isCorrect && ctx.localHour >= 22;
    case 'early_bird':
      return ctx.isCorrect && ctx.localHour < 7;
    case 'perfect_week':
      return ctx.isCorrect && ctx.streak >= 7;
    default:
      return false;
  }
}
