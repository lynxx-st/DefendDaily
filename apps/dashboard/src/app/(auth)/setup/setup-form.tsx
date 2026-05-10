'use client';

import { useActionState } from 'react';
import { Globe, Clock4, CheckCircle2 } from 'lucide-react';

const TIMEZONES = [
  { tz: 'America/New_York', city: 'New York' },
  { tz: 'America/Chicago', city: 'Chicago' },
  { tz: 'America/Denver', city: 'Denver' },
  { tz: 'America/Los_Angeles', city: 'Los Angeles' },
  { tz: 'America/Toronto', city: 'Toronto' },
  { tz: 'Europe/London', city: 'London' },
  { tz: 'Europe/Berlin', city: 'Berlin' },
  { tz: 'Europe/Paris', city: 'Paris' },
  { tz: 'Asia/Tokyo', city: 'Tokyo' },
  { tz: 'Asia/Singapore', city: 'Singapore' },
  { tz: 'Australia/Sydney', city: 'Sydney' },
];

const PUZZLE_TIMES = [
  { value: '08:00', label: '8:00 AM', hint: 'Inbox-time' },
  { value: '09:00', label: '9:00 AM', hint: 'Recommended · highest engagement' },
  { value: '10:00', label: '10:00 AM', hint: 'Mid-morning' },
  { value: '12:00', label: '12:00 PM', hint: 'Lunch-time' },
];

export type SetupState = { error?: string };

export type SetupAction = (state: SetupState, formData: FormData) => Promise<SetupState>;

export function SetupForm({ action }: { action: SetupAction }) {
  const [state, formAction, pending] = useActionState<SetupState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-7">
      <fieldset>
        <legend className="flex items-center gap-2 text-title-sm text-body-strong">
          <Globe size={14} className="text-primary-glow" />
          Organization timezone
        </legend>
        <p className="mt-1 text-body-sm text-body">
          Used to schedule the daily 9 AM puzzle and align reports.
        </p>
        <select
          id="timezone"
          name="timezone"
          defaultValue="America/New_York"
          className="mt-3 h-11 w-full rounded-md border border-hairline bg-surface-card px-4 text-body-md text-body-strong focus:border-primary focus:outline-none"
        >
          {TIMEZONES.map(z => (
            <option key={z.tz} value={z.tz}>
              {z.city} · {z.tz}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend className="flex items-center gap-2 text-title-sm text-body-strong">
          <Clock4 size={14} className="text-primary-glow" />
          Daily delivery time
        </legend>
        <p className="mt-1 text-body-sm text-body">
          When everyone in your org sees their puzzle. Avoid late-day for higher response.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {PUZZLE_TIMES.map((t, i) => (
            <label
              key={t.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-hairline bg-surface-card p-3 text-body-sm has-[:checked]:border-primary has-[:checked]:bg-surface-card-elevated"
            >
              <input
                type="radio"
                name="puzzle_time"
                value={t.value}
                defaultChecked={i === 1}
                className="mt-0.5 accent-primary"
              />
              <div>
                <p className="font-medium text-body-strong">{t.label}</p>
                <p className="mt-0.5 text-caption text-muted">{t.hint}</p>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <div className="flex items-start gap-2 rounded-md border border-semantic-error/40 bg-semantic-error/10 p-3 text-body-sm text-semantic-error">
          <span aria-hidden>!</span>
          <p>{state.error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-button text-on-primary hover:bg-primary-active disabled:opacity-60"
      >
        {pending ? (
          'Saving…'
        ) : (
          <>
            <CheckCircle2 size={16} />
            Launch DefendDaily
          </>
        )}
      </button>
    </form>
  );
}
