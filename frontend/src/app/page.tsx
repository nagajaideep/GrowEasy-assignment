'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchHealth, importCsvStream } from '@/lib/api';
import { BatchProgress, ImportResult, RawRecord } from '@/lib/types';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sidebar } from '@/components/Sidebar';
import { ImportModal } from '@/components/ImportModal';
import { ResultView } from '@/components/ResultView';

export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    fetchHealth().then((h) => setProvider(h?.provider ?? null));
  }, []);

  const handleConfirm = useCallback(async (rows: RawRecord[]) => {
    setProcessing(true);
    setProgress(null);
    setError(null);
    try {
      await importCsvStream(rows, {
        onProgress: (p) => setProgress(p),
        onResult: (r) => {
          setResult(r);
          setProcessing(false);
          setModalOpen(false);
        },
        onError: (message) => {
          setError(message);
          setProcessing(false);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
      setProcessing(false);
    }
  }, []);

  const openImporter = () => {
    setError(null);
    setModalOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Lead Sources</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Connect, manage, and control all your lead channels from one dashboard.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {provider && (
              <span className="hidden rounded-full bg-accent-50 px-3 py-1 text-xs font-medium text-accent-700 dark:bg-accent-950 dark:text-accent-300 sm:inline">
                AI: {provider}
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
          {!result ? (
            <div className="animate-fade-in">
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-950/40">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </span>
                <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">Import Leads via CSV</h2>
                <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  Upload any CSV — Facebook, Google Ads, Excel, real-estate exports, and more. Our AI maps your
                  columns into the GrowEasy CRM format automatically.
                </p>
                <button
                  type="button"
                  onClick={openImporter}
                  className="mt-6 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
                >
                  Import Leads via CSV
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { title: 'Any format', body: 'Different column names, layouts and structures all work.' },
                  { title: 'AI field mapping', body: 'Records are batched and mapped into 15 CRM fields.' },
                  { title: 'Clean output', body: 'Invalid rows are skipped; results export to CSV.' },
                ].map((f) => (
                  <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{f.title}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{f.body}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Import Complete</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Review your extracted leads below, then download or import another file.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openImporter}
                  className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
                >
                  Import Leads via CSV
                </button>
              </div>
              <ResultView result={result} onReset={() => setResult(null)} />
            </div>
          )}
        </main>
      </div>

      <ImportModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        processing={processing}
        progress={progress}
        error={error}
      />
    </div>
  );
}
