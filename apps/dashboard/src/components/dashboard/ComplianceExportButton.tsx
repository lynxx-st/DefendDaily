'use client';

import { useState } from 'react';
import { Download, Loader2, FileText } from 'lucide-react';

type Props = {
  orgId: string;
  orgName: string;
  variant?: 'inline' | 'card';
};

export function ComplianceExportButton({ orgId, orgName, variant = 'inline' }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);

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
      setLastExport(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  }

  if (variant === 'card') {
    return (
      <div className="rounded-xl border border-hairline bg-surface-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/15 text-primary-glow">
            <FileText size={18} />
          </div>
          {lastExport && (
            <span className="text-caption text-muted">Last exported {lastExport}</span>
          )}
        </div>
        <h3 className="mt-4 text-title-md text-body-strong">SOC 2 / HIPAA evidence PDF</h3>
        <p className="mt-1 text-body-sm text-body">
          Training summary, phishing results, and a signed attestation block — formatted
          for cyber-insurance questionnaires.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={loading}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-button text-on-primary hover:bg-primary-active disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {loading ? 'Generating PDF…' : 'Generate report'}
        </button>
        {error && <p className="mt-3 text-body-sm text-semantic-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-[18px] text-button text-on-primary hover:bg-primary-active disabled:opacity-60"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {loading ? 'Generating…' : 'Export Compliance PDF'}
      </button>
      {error && <p className="text-body-sm text-semantic-error">{error}</p>}
    </div>
  );
}
