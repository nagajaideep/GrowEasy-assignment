'use client';

import { useMemo, useState } from 'react';
import { CRM_FIELDS, CrmRecord, ImportResult, SkippedRecord } from '@/lib/types';
import { downloadText, toCsv } from '@/lib/csv';
import { Column, VirtualTable } from './VirtualTable';
import { StatCard } from './StatCard';
import { StatusBadge } from './StatusBadge';

function formatContact(r: CrmRecord): string {
  if (!r.mobile_without_country_code) return '—';
  return `${r.country_code ? r.country_code + ' ' : ''}${r.mobile_without_country_code}`.trim();
}

function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  // Detect whether the source value carried a time component. Date-only values
  // (e.g. "2026-05-15") are parsed as UTC midnight, so rendering them in local
  // time would fabricate a spurious clock time (e.g. "05:30 AM" in IST). For
  // those, show only the date (formatted in UTC to avoid any day shift).
  const hasTime = /\d{1,2}:\d{2}/.test(value) || /T\d{2}/.test(value);
  if (!hasTime) {
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const crmColumns: Column<CrmRecord>[] = [
  { key: 'name', label: 'Lead Name', minWidth: 150, render: (r) => <span className="font-medium text-slate-800 dark:text-slate-100">{r.name || '—'}</span> },
  { key: 'email', label: 'Email', minWidth: 200, render: (r) => r.email || '—' },
  { key: 'contact', label: 'Contact', minWidth: 160, render: (r) => <span className="font-mono text-xs">{formatContact(r)}</span> },
  { key: 'created_at', label: 'Date Created', minWidth: 170, render: (r) => <span className="text-slate-500 dark:text-slate-400">{formatDate(r.created_at)}</span> },
  { key: 'company', label: 'Company', minWidth: 140, render: (r) => r.company || '—' },
  { key: 'city', label: 'City', minWidth: 110, render: (r) => r.city || '—' },
  { key: 'crm_status', label: 'Status', minWidth: 140, render: (r) => <StatusBadge status={r.crm_status} /> },
  { key: 'data_source', label: 'Source', minWidth: 140, render: (r) => r.data_source || '—' },
  { key: 'crm_note', label: 'Note', minWidth: 240, render: (r) => <span className="text-slate-500 dark:text-slate-400">{r.crm_note || '—'}</span> },
];

const skippedColumns: Column<SkippedRecord>[] = [
  { key: 'rowNumber', label: 'Row', minWidth: 70, render: (r) => <span className="font-mono">{r.rowNumber}</span> },
  { key: 'reason', label: 'Reason', minWidth: 220, render: (r) => <span className="text-amber-600 dark:text-amber-400">{r.reason}</span> },
  {
    key: 'raw',
    label: 'Original Row',
    minWidth: 340,
    render: (r) => (
      <span className="text-slate-500 dark:text-slate-400">
        {Object.entries(r.raw)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ') || '—'}
      </span>
    ),
  },
];

export function ResultView({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  const [tab, setTab] = useState<'imported' | 'skipped'>('imported');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return result.records;
    return result.records.filter((r) =>
      [r.name, r.email, r.mobile_without_country_code, r.company, r.city]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [query, result.records]);

  const handleDownload = () => downloadText('groweasy-crm.csv', toCsv(result.records, CRM_FIELDS));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Rows" value={result.totalRows} tone="slate" />
        <StatCard label="Imported" value={result.totalImported} tone="brand" />
        <StatCard label="Skipped" value={result.totalSkipped} tone="amber" />
        <StatCard label="Batches" value={result.batches} tone="blue" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Your Leads</h3>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setTab('imported')}
                className={[
                  'rounded-md px-3 py-1 text-xs font-semibold transition',
                  tab === 'imported' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500',
                ].join(' ')}
              >
                Imported ({result.totalImported})
              </button>
              <button
                type="button"
                onClick={() => setTab('skipped')}
                className={[
                  'rounded-md px-3 py-1 text-xs font-semibold transition',
                  tab === 'skipped' ? 'bg-white text-amber-600 shadow-sm dark:bg-slate-900' : 'text-slate-500',
                ].join(' ')}
              >
                Skipped ({result.totalSkipped})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tab === 'imported' && (
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter email or phone number..."
                  className="h-9 w-56 rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-sm text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-brand-900"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={result.records.length === 0}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download CSV
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Import Another
            </button>
          </div>
        </div>

        <div className="p-4">
          {tab === 'imported' ? (
            <>
              <VirtualTable
                columns={crmColumns}
                rows={filtered}
                rowKey={(_, i) => i}
                emptyMessage={query ? 'No leads match your search.' : 'No records were imported.'}
              />
              <p className="mt-2 px-1 text-xs text-slate-400">
                {filtered.length} of {result.records.length} leads · extracted via {result.provider}
              </p>
            </>
          ) : (
            <VirtualTable
              columns={skippedColumns}
              rows={result.skipped}
              rowKey={(r) => r.rowNumber}
              emptyMessage="Nothing was skipped — every row had a valid contact."
            />
          )}
        </div>
      </div>
    </div>
  );
}
