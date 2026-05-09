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
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${orgName.replace(/[^a-zA-Z0-9_-]+/g, '_')}_compliance.pdf`;
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
        type="button"
        onClick={handleExport}
        disabled={loading}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-[18px] text-button text-on-primary hover:bg-primary-active disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" className="opacity-75" />
            </svg>
            Generating PDF…
          </>
        ) : (
          <>Export Compliance PDF</>
        )}
      </button>
      {error && <p className="text-body-sm text-semantic-error">{error}</p>}
      <p className="text-caption text-muted max-w-md">
        Includes training interactions, average Risk Score, phishing simulation results,
        and a signed attestation block.
      </p>
    </div>
  );
}
