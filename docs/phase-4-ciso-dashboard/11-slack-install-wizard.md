# Step 4.11: Slack Install Wizard (/setup page)

## apps/dashboard/src/app/(auth)/setup/page.tsx

This page is shown after a successful Slack OAuth install. It collects org timezone + puzzle time.

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney',
];

const PUZZLE_TIMES = [
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM (Recommended)' },
  { value: '10:00', label: '10:00 AM' },
  { value: '12:00', label: '12:00 PM (Lunch)' },
];

export default function SetupPage() {
  const router = useRouter();
  const [timezone, setTimezone] = useState('America/New_York');
  const [puzzleTime, setPuzzleTime] = useState('09:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone, puzzle_time: puzzleTime }),
      });
      if (!res.ok) throw new Error('Setup failed');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🛡️ Welcome to DefendDaily!</h1>
          <p className="text-gray-500 mt-1">
            Let's configure your daily puzzle schedule.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Timezone
            </label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Daily Puzzle Delivery Time
            </label>
            <select
              value={puzzleTime}
              onChange={e => setPuzzleTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {PUZZLE_TIMES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2 px-4 bg-brand text-white rounded-lg font-medium
            hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Launch DefendDaily →'}
        </button>
      </div>
    </main>
  );
}
```

Add API route in `apps/api/src/routes/orgs.ts`:
```typescript
orgsRouter.post('/setup', async (req, res) => {
  const { timezone, puzzle_time, slack_team_id } = req.body;
  await db.query(
    'UPDATE organizations SET timezone = $1, puzzle_time = $2 WHERE slack_team_id = $3',
    [timezone, puzzle_time, slack_team_id]
  );
  res.json({ ok: true });
});
```

**Commit:**
```bash
git add apps/dashboard/src/app/(auth)/setup/
git commit -m "feat(dashboard): add post-Slack-install setup wizard for timezone and puzzle time"
```

**Update PROGRESS.md:** Check off 4.11. Set Last Completed to "4.11 — setup wizard page".
