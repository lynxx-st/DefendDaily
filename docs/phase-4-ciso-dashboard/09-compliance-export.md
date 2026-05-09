# Step 4.09: ComplianceExportButton.tsx

## apps/dashboard/src/components/ComplianceExportButton.tsx

```typescript
'use client';

import { useState } from 'react';

type Props = {
  orgId: string;
  orgName: string;
};

export function ComplianceExportButton({ orgId, orgName }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/compliance/${orgId}/pdf`, { method: 'GET' });
      if (!res.ok) throw new Error(`Failed to generate PDF: ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${orgName.replace(/\s+/g, '_')}_compliance_report.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleExport}
        disabled={loading}
        className="px-4 py-2 bg-brand text-white rounded-lg font-medium
          hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Generating PDF...
          </>
        ) : (
          <>📄 Export Compliance PDF</>
        )}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-gray-500">
        Includes training interactions, average scores, phishing results, and signed attestation.
        Satisfies most cyber insurance questionnaire requirements.
      </p>
    </div>
  );
}
```

**Commit:**
```bash
git add apps/dashboard/src/components/ComplianceExportButton.tsx
git commit -m "feat(dashboard): add ComplianceExportButton with loading state and blob download"
```

**Update PROGRESS.md:** Check off 4.09. Set Last Completed to "4.09 — ComplianceExportButton.tsx".
