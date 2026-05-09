# Step 4.01: Next.js 14 + Tailwind CSS Init

## Initialize apps/dashboard

```bash
cd apps/dashboard
pnpm create next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-git
# When prompted: use App Router = yes
```

Or manually:
```bash
cd apps/dashboard
pnpm init
pnpm add next@14 react react-dom
pnpm add -D typescript @types/node @types/react @types/react-dom tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## apps/dashboard/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## apps/dashboard/tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'risk-red':    '#DC2626',
        'risk-amber':  '#D97706',
        'risk-green':  '#16A34A',
        'brand':       '#1D4ED8',
        'sentrylife':  '#7C3AED', // Purple theme for SentryLife (Phase 5)
      },
    },
  },
  plugins: [],
};

export default config;
```

## apps/dashboard/src/app/layout.tsx

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DefendDaily — CISO Dashboard',
  description: 'Human Risk Management Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

## apps/dashboard/package.json scripts

```json
{
  "name": "dashboard",
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

**Verify:** `pnpm dev:dashboard` → http://localhost:3000 shows Next.js default page.

**Commit:**
```bash
git add apps/dashboard/
git commit -m "feat(dashboard): initialize Next.js 14 App Router with Tailwind CSS"
```

**Update PROGRESS.md:** Check off 4.01. Set Last Completed to "4.01 — Next.js 14 init".
