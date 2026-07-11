'use client';

import { useCallback, useRef, useState } from 'react';
import { parseCsvFile } from '@/lib/csv';
import { downloadText } from '@/lib/csv';
import { REQUIRED_HEADERS, SAMPLE_CSV } from '@/lib/sample';
import { BatchProgress, RawRecord } from '@/lib/types';
import { Modal } from './Modal';
import { PreviewTable } from './PreviewTable';

const MAX_MB = 5;
const PREVIEW_LIMIT = 50;

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (rows: RawRecord[]) => void;
  processing: boolean;
  progress: BatchProgress | null;
  error: string | null;
}

export function ImportModal({ open, onClose, onConfirm, processing, progress, error }: ImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RawRecord[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setLocalError(null);
    setDragging(false);
  }, []);

  const handleClose = useCallback(() => {
    if (processing) return;
    reset();
    onClose();
  }, [processing, reset, onClose]);

  const handleFile = useCallback(async (f: File) => {
    setLocalError(null);
    if (!/\.csv$/i.test(f.name) && f.type !== 'text/csv') {
      setLocalError('Please upload a .csv file.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setLocalError(`File is larger than ${MAX_MB} MB.`);
      return;
    }
    try {
      const parsed = await parseCsvFile(f);
      if (parsed.rows.length === 0) {
        setLocalError('That CSV has no data rows.');
        return;
      }
      setFile(f);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to parse the CSV.');
    }
  }, []);

  const prettySize = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(2)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

  const pct =
    progress && progress.totalRows > 0
      ? Math.round((progress.rowsProcessed / progress.totalRows) * 100)
      : 0;

  const footer = (
    <>
      <button
        type="button"
        onClick={handleClose}
        disabled={processing}
        className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => file && onConfirm(rows)}
        disabled={!file || processing}
        className="rounded-xl bg-brand-500 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300 dark:disabled:bg-brand-500/40"
      >
        {processing ? 'Processing…' : 'Upload File'}
      </button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Leads via CSV"
      subtitle="Upload a CSV file to bulk import leads into your system."
      dismissable={!processing}
      footer={footer}
      widthClass="max-w-2xl"
    >
      {/* Processing overlay state */}
      {processing ? (
        <div className="py-6">
          <div className="flex items-center gap-3">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <p className="font-semibold text-slate-800 dark:text-slate-100">AI is extracting your CRM records…</p>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {progress
              ? `Batch ${Math.min(progress.batchIndex + 1, progress.totalBatches)} of ${progress.totalBatches} · ${progress.rowsProcessed}/${progress.totalRows} rows`
              : 'Preparing…'}
          </p>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full rounded-full bg-brand-500 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 flex gap-4 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">Imported: <strong>{progress?.importedSoFar ?? 0}</strong></span>
            <span className="text-amber-600 dark:text-amber-400">Skipped: <strong>{progress?.skippedSoFar ?? 0}</strong></span>
            <span className="ml-auto text-slate-400">{pct}%</span>
          </div>
        </div>
      ) : file ? (
        /* File selected -> show file card + preview (screenshot 2) */
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100 text-accent-700 dark:bg-accent-950 dark:text-accent-300">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{file.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{prettySize(file.size)} · {rows.length} rows</p>
            </div>
            <button
              type="button"
              onClick={reset}
              aria-label="Remove file"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <PreviewTable headers={headers} rows={rows.slice(0, PREVIEW_LIMIT)} />
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Showing {Math.min(PREVIEW_LIMIT, rows.length)} of {rows.length} rows. No AI processing has happened yet.
          </p>
        </div>
      ) : (
        /* Upload dropzone (screenshot 1) */
        <div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
            }}
            className={[
              'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition',
              dragging
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-brand-600 dark:hover:bg-slate-800/50',
            ].join(' ')}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-accent-600 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            <div>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">Drop your CSV file here</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">or click to browse files</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
              Supported file: .csv (max {MAX_MB}MB)
            </span>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-slate-400 dark:text-slate-500">
            Required headers: {REQUIRED_HEADERS}. Any layout works — the AI maps your columns to CRM fields to reduce upload errors.
          </p>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => downloadText('groweasy-sample-template.csv', SAMPLE_CSV)}
              className="inline-flex items-center gap-2 rounded-xl border border-accent-500 px-4 py-2 text-sm font-semibold text-accent-600 transition hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-950/40"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Sample CSV Template
            </button>
          </div>
        </div>
      )}

      {(localError || error) && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {localError || error}
        </p>
      )}
    </Modal>
  );
}
