# Steps 5.02 + 5.03 + 5.04: SentryLife UI Pages

## SentryLife Tailwind Theme (already in tailwind.config.ts from Phase 4)

The `sentrylife` color (`#7C3AED` purple) is already defined.
The `/sentrylife/*` route group uses a different layout with the purple theme.

## apps/dashboard/src/app/(sentrylife)/layout.tsx

```typescript
export default function SentryLifeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-purple-50">
      <nav className="bg-sentrylife text-white px-6 py-4 flex items-center gap-3">
        <span className="text-xl font-bold">🛡️ SentryLife</span>
        <span className="text-purple-200 text-sm">Family Security</span>
      </nav>
      <main className="p-6 max-w-4xl mx-auto">{children}</main>
    </div>
  );
}
```

## apps/dashboard/src/app/(sentrylife)/family/page.tsx

```typescript
import { auth } from '@/auth';
import { api } from '@/lib/api';

export default async function FamilyPage() {
  const session = await auth();
  // TODO: fetch family members from API
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Family Security Hub</h1>
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Family Members</h2>
        <p className="text-gray-500 text-sm">
          Invite family members to protect them with SentryLife.
        </p>
        <button className="mt-4 px-4 py-2 bg-sentrylife text-white rounded-lg text-sm font-medium">
          + Invite Family Member
        </button>
      </div>
    </div>
  );
}
```

## apps/dashboard/src/app/(sentrylife)/home-defense/page.tsx

```typescript
export default function HomeDefensePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">🪤 Home Defense Kit</h1>
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Canary Token Kit</h2>
        <p className="text-gray-600 text-sm mb-4">
          Download 5 "honey trap" files. Place them in your Documents folder.
          If anyone opens them (including malware), you'll get an instant alert.
        </p>
        <div className="grid grid-cols-5 gap-3 mb-6">
          {['Word Doc', 'PDF', 'Excel', 'Image', 'Web Link'].map((type) => (
            <div key={type} className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl mb-1">
                {type === 'Word Doc' ? '📝' : type === 'PDF' ? '📄' : type === 'Excel' ? '📊' : type === 'Image' ? '🖼️' : '🔗'}
              </div>
              <div className="text-xs text-gray-600">{type}</div>
            </div>
          ))}
        </div>
        <button className="px-6 py-2 bg-sentrylife text-white rounded-lg font-medium">
          📦 Download Defense Kit
        </button>
        <p className="text-xs text-gray-400 mt-2">
          The download button will trigger canary token generation (implemented in Step 5.07).
        </p>
      </div>
    </div>
  );
}
```

**Commit:**
```bash
git add apps/dashboard/src/app/(sentrylife)/
git commit -m "feat(dashboard): add SentryLife route group with family hub and home defense kit pages"
```

**Update PROGRESS.md:** Check off 5.02, 5.03, 5.04. Set Last Completed to "5.04 — SentryLife UI pages".
