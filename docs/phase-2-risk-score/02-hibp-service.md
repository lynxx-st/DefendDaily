# Step 2.02 + 2.09: HIBP Service + Redis Cache

## apps/api/src/services/hibp.ts

```typescript
import axios from 'axios';
import crypto from 'crypto';
import { redis } from '../db/redis';
import { env } from '../config/env';

type BreachEntry = {
  Name: string;
  BreachDate: string;
  DataClasses: string[];
  Description: string;
};

function emailCacheKey(email: string): string {
  // Hash email for privacy — never store raw email in Redis keys (CLAUDE.md §10)
  const hash = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
  return `hibp:${hash.substring(0, 16)}`;
}

export async function checkEmailBreaches(email: string): Promise<BreachEntry[]> {
  const cacheKey = emailCacheKey(email);
  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    return JSON.parse(cached) as BreachEntry[];
  }

  if (!env.HIBP_API_KEY) {
    console.warn('HIBP_API_KEY not set — skipping breach check');
    return [];
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
    );

    const breaches = response.data;
    await redis.set(cacheKey, JSON.stringify(breaches), 'EX', 86400);
    return breaches;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      // 404 = no breaches found — cache the empty result
      await redis.set(cacheKey, '[]', 'EX', 86400);
      return [];
    }
    throw err;
  }
}
```

**Commit:**
```bash
git add apps/api/src/services/hibp.ts
git commit -m "feat(services): add HIBP breach lookup with Redis 24h cache and email hashing"
```

**Update PROGRESS.md:** Check off 2.02 and 2.09. Set Last Completed to "2.09 — hibp.ts + cache".
