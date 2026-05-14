# Phase 6 — UI/UX & Design System Overhaul

**Goal:** Transform the existing functional interfaces into a polished, design-system-driven
product. Ship a full marketing landing page, a complete component library, redesigned dashboard
pages, smooth motion, and an onboarding experience that converts trial installs to paid seats.

**Exit criteria:** Marketing homepage passes all design token checks from DESIGN.md (no raw hex,
correct spotlight glow, terminal mockup grid). All dashboard pages have `loading.tsx` + `error.tsx`
siblings. Framer Motion transitions run on every route change. Multi-step onboarding wizard
completes and writes org settings. Visual regression snapshots pass.

**Estimated effort:** 4 weeks

**Prerequisites:** Phase 4 (CISO Dashboard), Phase 5 (SentryLife).

## Steps (20 total)

| # | Detail File | Description |
|---|-------------|-------------|
| 6.01 | 01-marketing-landing.md | Full marketing homepage (hero + terminal mockup + spotlight glow) |
| 6.02 | 01-marketing-landing.md | Pricing band + CTA spotlight + dark footer |
| 6.03 | 02-component-library.md | Toast notification system (sonner) |
| 6.04 | 02-component-library.md | Modal component (Radix Dialog) |
| 6.05 | 02-component-library.md | Tooltip component (Radix Tooltip) |
| 6.06 | 02-component-library.md | DataTable component (sortable, filterable, keyset-paginated) |
| 6.07 | 02-component-library.md | Mobile hamburger nav + drawer |
| 6.08 | 02-component-library.md | Skeleton loading components |
| 6.09 | 03-dashboard-redesign.md | loading.tsx siblings for all dashboard page segments |
| 6.10 | 03-dashboard-redesign.md | error.tsx, 404, and 500 pages |
| 6.11 | 03-dashboard-redesign.md | Dashboard overview activity feed (last 10 org puzzle answers) |
| 6.12 | 03-dashboard-redesign.md | Team page redesign (user cards + inline risk gauges) |
| 6.13 | 03-dashboard-redesign.md | Animated CountUp stat numbers |
| 6.14 | 04-motion-and-polish.md | Framer Motion page transitions + card hover lifts |
| 6.15 | 04-motion-and-polish.md | Mobile responsive audit + fix all breakpoints |
| 6.16 | 04-motion-and-polish.md | Accessible keyboard navigation audit (focus rings, skip-to-content) |
| 6.17 | 05-onboarding-and-settings.md | Multi-step onboarding wizard with progress bar |
| 6.18 | 05-onboarding-and-settings.md | Settings page redesign (tabs: General / Integrations / Billing / Notifications) |
| 6.19 | 05-onboarding-and-settings.md | Risk score trend sparkline chart (7-day inline chart per user on team page) |
| 6.20 | 05-onboarding-and-settings.md | Phase 6 visual regression tests |

## Key Architecture Notes

- **Design token enforcement:** Every color reference must resolve to a `{colors.*}` token from
  DESIGN.md. Run `grep -r '#[0-9a-fA-F]' apps/dashboard/` before committing — zero results expected.
- **Marketing page route:** `/` (root) in the Next.js app. Currently redirects to `/dashboard`.
  Swap to a proper marketing page; authenticated users auto-redirect to `/dashboard`.
- **Component library location:** `apps/dashboard/components/ui/` — shared primitives that page
  components compose. Never import directly from Radix primitives in page files.
- **Framer Motion:** Install `framer-motion`. Wrap the root layout's `{children}` in
  `<AnimatePresence mode="wait">`. Each page exports a `<motion.div>` with `variants`.
- **Visual regression:** Use `@testing-library/react` + `vitest` with `toMatchSnapshot()` on
  rendered component trees. Not pixel-diffing — snapshot the JSX output to catch unintended markup changes.

## Design System Quick Reference

| Token | Value | Usage |
|-------|-------|-------|
| `colors.canvas` | #0f0f0f | Page background |
| `colors.primary` | #0007cd | CTAs, wordmark, spotlight glow |
| `colors.surface-card` | #1a1a1a | Card background |
| `colors.surface-card-elevated` | #242424 | Hover / modal surface |
| `typography.display-mega` | 72px / weight 500 | Hero h1 |
| `rounded.md` | 8px | CTA buttons |
| `rounded.xl` | 16px | Cards |
| `spacing.section` | 96px | Between page bands |
