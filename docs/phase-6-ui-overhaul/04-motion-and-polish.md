# Steps 6.14 – 6.16: Motion and Polish

## 6.14 — Framer Motion Page Transitions + Card Hover Lifts

### Install

```bash
pnpm --filter dashboard add framer-motion
```

### apps/dashboard/components/PageTransition.tsx

```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15, ease: 'easeIn' } },
};

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
```

Wrap the `{children}` in the root layout with `<AnimatePresence mode="wait">`. Each
dashboard page wraps its root `<div>` in `<PageTransition>`.

### apps/dashboard/components/ui/AnimatedCard.tsx

```tsx
'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export function AnimatedCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={`rounded-xl border border-white/10 bg-surface-card ${className}`}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,7,205,0.12)' }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

**Commit:**
```bash
git add apps/dashboard/components/PageTransition.tsx apps/dashboard/components/ui/AnimatedCard.tsx
git commit -m "feat(dashboard): add Framer Motion page transitions and animated card hover lifts"
```

**Update PROGRESS.md:** Check off 6.14.

---

## 6.15 — Mobile Responsive Audit + Fix All Breakpoints

This step is an audit-and-fix pass. Apply all fixes in a single commit.

**Checklist:**

- [ ] Hero h1 font size: `text-[72px] md:text-[56px] sm:text-[36px]` (desktop → tablet → mobile)
- [ ] Pricing grid: `grid-cols-3 md:grid-cols-1` (stack vertically on mobile)
- [ ] Dashboard stat grid: `grid-cols-4 lg:grid-cols-2 sm:grid-cols-1`
- [ ] Team user card grid: `grid-cols-3 lg:grid-cols-2 sm:grid-cols-1`
- [ ] DataTable: `overflow-x-auto` wrapper on all table containers
- [ ] TopNav: Hide desktop nav links below `md:`. Show `<MobileNav>` below `md:`.
- [ ] All touch targets: minimum `h-10` (40px) per WCAG AA
- [ ] Modal: `max-w-lg w-full mx-4` so it doesn't overflow on small screens
- [ ] TerminalMockupGrid: `grid-cols-2 sm:grid-cols-1` for mobile

### Verification command

```bash
# Run in the browser devtools or use Playwright viewport tests:
# Test at: 1280px (desktop), 768px (tablet), 375px (mobile)
```

**Commit:**
```bash
git add apps/dashboard/
git commit -m "fix(dashboard): responsive audit — fix all breakpoints for mobile and tablet"
```

**Update PROGRESS.md:** Check off 6.15.

---

## 6.16 — Accessible Keyboard Navigation Audit (Focus Rings, Skip-to-Content)

### apps/dashboard/app/layout.tsx (add skip link)

```tsx
// First element inside <body> — before the nav
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:inline-flex focus:h-10 focus:items-center focus:justify-center focus:px-4 focus:rounded-md focus:bg-primary focus:text-white focus:text-sm focus:font-medium"
>
  Skip to main content
</a>
```

Add `id="main-content"` to the `<main>` element on each dashboard page.

### apps/dashboard/app/globals.css (focus ring tokens)

```css
/* Keyboard focus ring — visible only on keyboard nav, not mouse click */
:focus-visible {
  outline: 2px solid #0007cd;
  outline-offset: 2px;
}

/* Remove default focus ring from mouse clicks */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Audit checklist

- [ ] All `<button>` and `<a>` elements have visible `:focus-visible` ring
- [ ] Modal focus traps correctly (Radix Dialog handles this natively)
- [ ] Drawer (`MobileNav`) focus traps when open
- [ ] Leaderboard table is keyboard-navigable via `tabIndex={0}` on rows
- [ ] All icon-only buttons have `aria-label`
- [ ] Color contrast: text on `surface-card` background ≥ 4.5:1 (WCAG AA)
- [ ] `<img>` elements have `alt` text; decorative images have `alt=""`

**Commit:**
```bash
git add apps/dashboard/app/layout.tsx apps/dashboard/app/globals.css
git commit -m "feat(dashboard): add skip-to-content link and global focus-visible ring for keyboard navigation"
```

**Update PROGRESS.md:** Check off 6.16. Set Last Completed to "6.16 — keyboard navigation audit".
