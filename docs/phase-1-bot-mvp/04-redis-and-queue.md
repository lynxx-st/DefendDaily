# Steps 1.08 + 1.11: Redis Client + BullMQ Queue

## 1.08 apps/api/src/db/redis.ts

```typescript
import Redis from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('error', (err) => console.error('Redis client error:', err));
redis.on('connect', () => console.log('Redis connected'));
```

Redis key conventions (must follow these exactly across all services):
| Key pattern | Type | TTL | Purpose |
|-------------|------|-----|---------|
| `leaderboard:{org_id}` | Sorted Set | none | weekly points, member=user_id |
| `streak:{user_id}` | String (int) | none | current streak, synced to PG nightly |
| `hibp:{email_hash}` | String (JSON) | 86400s | HIBP breach summary cache |
| `puzzle:today:{org_id}:{user_id}` | String | 86400s | prevents double-delivery |
| `session:{token}` | Hash | 3600s | web session data |

Email hash for HIBP cache key: `crypto.createHash('sha256').update(email.toLowerCase()).digest('hex')`
(Never store raw email in Redis keys — CLAUDE.md §10)

## 1.11 apps/api/src/jobs/queue.ts

```typescript
import { Queue, ConnectionOptions } from 'bullmq';
import { env } from '../config/env';

const url = new URL(env.REDIS_URL);
export const connection: ConnectionOptions = {
  host: url.hostname,
  port: parseInt(url.port || '6379', 10),
};

export const dailyPuzzleQueue = new Queue('daily-puzzle', { connection });
export const riskScoreQueue = new Queue('risk-score', { connection });
export const hibpQueue = new Queue('hibp-check', { connection });
export const guardianAlertQueue = new Queue('guardian-alert', { connection });
```

**Verify Redis connection:**
```bash
redis-cli -u redis://localhost:6379 ping
# Expected: PONG
```

**Commit:**
```bash
git add apps/api/src/db/redis.ts apps/api/src/jobs/queue.ts
git commit -m "feat(api): add ioredis client and BullMQ queue setup"
```

**Update PROGRESS.md:** Check off 1.08 and 1.11. Set Last Completed to "1.11 — queue.ts".
