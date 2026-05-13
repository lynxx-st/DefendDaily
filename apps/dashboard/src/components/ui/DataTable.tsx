'use client';
import { useState, useTransition, type ReactNode } from 'react';

export type ColumnDef<T> = {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => ReactNode;
};

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onNextPage,
  onPrevPage,
  hasNextPage,
  hasPrevPage,
}: {
  columns: ColumnDef<T>[];
  data: T[];
  onNextPage?: () => void;
  onPrevPage?: () => void;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}) {
  const [filter, setFilter] = useState('');
  const [, startTransition] = useTransition();

  const visible = filter
    ? data.filter(row =>
        Object.values(row).some(v =>
          String(v).toLowerCase().includes(filter.toLowerCase()),
        ),
      )
    : data;

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
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-caption-uppercase text-muted"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(row => (
              <tr
                key={row.id}
                className="border-b border-hairline last:border-0 hover:bg-surface-card/60"
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-body text-body-strong">
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={onPrevPage}
          disabled={!hasPrevPage}
          className="h-8 rounded-md border border-hairline px-3 text-body-sm text-body disabled:opacity-40 hover:bg-surface-card-elevated"
        >
          ← Prev
        </button>
        <button
          onClick={onNextPage}
          disabled={!hasNextPage}
          className="h-8 rounded-md border border-hairline px-3 text-body-sm text-body disabled:opacity-40 hover:bg-surface-card-elevated"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
