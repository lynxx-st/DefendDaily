'use client';

import { useActionState } from 'react';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

const PUZZLE_TIMES = [
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM (recommended)' },
  { value: '10:00', label: '10:00 AM' },
  { value: '12:00', label: '12:00 PM (lunch)' },
];

export type SetupState = { error?: string };

export type SetupAction = (state: SetupState, formData: FormData) => Promise<SetupState>;

export function SetupForm({ action }: { action: SetupAction }) {
  const [state, formAction, pending] = useActionState<SetupState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="timezone" className="block text-body-sm text-body-strong">
          Organization Timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          defaultValue="America/New_York"
          className="h-11 w-full rounded-md bg-surface-card-elevated px-4 text-body-md text-body-strong"
        >
          {TIMEZONES.map(tz => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="puzzle_time" className="block text-body-sm text-body-strong">
          Daily Puzzle Delivery Time
        </label>
        <select
          id="puzzle_time"
          name="puzzle_time"
          defaultValue="09:00"
          className="h-11 w-full rounded-md bg-surface-card-elevated px-4 text-body-md text-body-strong"
        >
          {PUZZLE_TIMES.map(t => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {state.error && <p className="text-body-sm text-semantic-error">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-[18px] text-button text-on-primary hover:bg-primary-active disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? 'Saving…' : 'Launch DefendDaily →'}
      </button>
    </form>
  );
}
