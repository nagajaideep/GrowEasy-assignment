import Papa from 'papaparse';
import { RawRecord } from './types';

export interface ParsedCsv {
  headers: string[];
  rows: RawRecord[];
}

/**
 * Parse a CSV file entirely in the browser for the preview step. No AI /
 * network call happens here — this is purely to show the user what they
 * uploaded before they confirm.
 */
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const headers = (results.meta.fields ?? []).filter(Boolean).map((h) => h.trim());
        const rows: RawRecord[] = results.data.map((row) => {
          const clean: RawRecord = {};
          for (const h of headers) {
            const value = row[h];
            clean[h] = value == null ? '' : String(value).trim();
          }
          return clean;
        });
        resolve({ headers, rows });
      },
      error: (err) => reject(err),
    });
  });
}

/** Serialise CRM records to a downloadable CSV string. */
export function toCsv<T extends Record<string, string>>(records: T[], fields: readonly string[]): string {
  const escape = (value: string) => {
    const v = (value ?? '').replace(/\r\n|\r|\n/g, '\\n');
    return /[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const header = fields.join(',');
  const body = records.map((r) => fields.map((f) => escape(r[f] ?? '')).join(','));
  return [header, ...body].join('\n');
}

/** Trigger a client-side download of a text blob. */
export function downloadText(filename: string, text: string, mime = 'text/csv'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
