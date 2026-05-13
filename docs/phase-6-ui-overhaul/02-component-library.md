# Steps 6.03–6.08: Component Library Expansion

## 6.03 — Toast Notification System (sonner)

```bash
pnpm add sonner
```

**`apps/dashboard/src/components/ui/Toast.tsx`**
```tsx
'use client'
import { Toaster } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#181818',
          border: '1px solid #222222',
          color: '#ffffff',
          borderRadius: '8px',
          fontSize: '14px',
        },
      }}
    />
  )
}
```

Add `<ToastProvider />` to `apps/dashboard/src/app/layout.tsx`.

Usage anywhere: `import { toast } from 'sonner'; toast.success('Saved!')`.

---

## 6.04 — Modal Component (Radix Dialog)

```bash
pnpm add @radix-ui/react-dialog
```

**`apps/dashboard/src/components/ui/Modal.tsx`**
```tsx
'use client'
import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

export function Modal({
  open, onOpenChange, title, description, children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-canvas/80 backdrop-blur-sm data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-hairline bg-surface-card p-7 shadow-2xl">
          <Dialog.Title className="text-title-md text-body-strong">{title}</Dialog.Title>
          {description && (
            <Dialog.Description className="mt-1 text-body-sm text-body">{description}</Dialog.Description>
          )}
          <div className="mt-5">{children}</div>
          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-md p-1.5 text-muted hover:bg-surface-card-elevated hover:text-body-strong" aria-label="Close">
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

---

## 6.05 — Tooltip Component (Radix Tooltip)

```bash
pnpm add @radix-ui/react-tooltip
```

**`apps/dashboard/src/components/ui/Tooltip.tsx`**
```tsx
'use client'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

export function Tooltip({ children, content }: { children: ReactNode; content: string }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="z-50 rounded-md border border-hairline bg-surface-card-elevated px-2.5 py-1.5 text-body-sm text-body-strong shadow-lg"
            sideOffset={6}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-surface-card-elevated" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
```

---

## 6.06 — DataTable Component (sortable, filterable, keyset-paginated)

**`apps/dashboard/src/components/ui/DataTable.tsx`**

Key behaviors:
- Accepts `columns: ColumnDef[]`, `data: T[]`, `onNextPage`, `onPrevPage`, `hasNextPage`
- Sort state controlled by `sortKey` + `sortDir` URL search params
- Filter input debounced 300ms, updates `q` search param
- No offset pagination — caller passes cursor from last row's `created_at`

```tsx
'use client'
import { useState, useTransition, type ReactNode } from 'react'

export type ColumnDef<T> = {
  key: keyof T & string
  label: string
  sortable?: boolean
  render?: (value: T[keyof T], row: T) => ReactNode
}

export function DataTable<T extends { id: string }>({
  columns, data, onNextPage, onPrevPage, hasNextPage, hasPrevPage,
}: {
  columns: ColumnDef<T>[]
  data: T[]
  onNextPage?: () => void
  onPrevPage?: () => void
  hasNextPage?: boolean
  hasPrevPage?: boolean
}) {
  const [filter, setFilter] = useState('')
  const [, startTransition] = useTransition()

  return (
    <div>
      <input
        className="mb-4 h-10 w-full rounded-md border border-hairline bg-surface-card px-4 text-body-sm text-body-strong placeholder:text-muted focus:border-primary focus:outline-none"
        placeholder="Filter…"
        value={filter}
        onChange={e => startTransition(() => setFilter(e.target.value))}
      />
      <div className="overflow-x-auto rounded-xl border border-hairline">
        <table className="w-full text-body-sm">
          <thead className="border-b border-hairline bg-surface-card-elevated">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-caption-uppercase text-muted">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data
              .filter(row =>
                !filter || Object.values(row).some(v =>
                  String(v).toLowerCase().includes(filter.toLowerCase())
                )
              )
              .map(row => (
                <tr key={row.id} className="border-b border-hairline last:border-0 hover:bg-surface-card/60">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-body text-body-strong">
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button onClick={onPrevPage} disabled={!hasPrevPage} className="h-8 rounded-md border border-hairline px-3 text-body-sm text-body disabled:opacity-40 hover:bg-surface-card-elevated">← Prev</button>
        <button onClick={onNextPage} disabled={!hasNextPage} className="h-8 rounded-md border border-hairline px-3 text-body-sm text-body disabled:opacity-40 hover:bg-surface-card-elevated">Next →</button>
      </div>
    </div>
  )
}
```

---

## 6.07 — Mobile Hamburger Nav + Drawer

**`apps/dashboard/src/components/app/MobileNav.tsx`**
```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { NAV_ITEMS } from './Sidebar'

export function MobileNav({ orgName }: { orgName: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-surface-card hover:text-body-strong md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <HamburgerIcon />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-canvas/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <nav className="absolute left-0 top-0 h-full w-72 border-r border-hairline bg-canvas px-6 py-8">
            <p className="mb-6 text-caption-uppercase text-muted">{orgName}</p>
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm text-body hover:bg-surface-card hover:text-body-strong">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
```

---

## 6.08 — Skeleton Loading Components

**`apps/dashboard/src/components/ui/Skeleton.tsx`**
```tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-surface-card-elevated ${className}`}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-hairline bg-surface-card p-5">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="mt-3 h-3 w-32" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-hairline overflow-hidden">
      <div className="border-b border-hairline bg-surface-card-elevated px-4 py-3">
        <Skeleton className="h-3 w-48" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-hairline px-4 py-3 last:border-0">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
```

**Commit:**
```bash
git add apps/dashboard/src/components/ui/{Toast,Modal,Tooltip,DataTable,MobileNav,Skeleton}.tsx
git commit -m "feat(dashboard): add Toast, Modal, Tooltip, DataTable, MobileNav, Skeleton components"
```
