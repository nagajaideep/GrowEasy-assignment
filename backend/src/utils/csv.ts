import Papa from 'papaparse';
import { CRM_FIELDS, CrmRecord, RawRecord } from '../types/crm';

/**
 * Parse a raw CSV string into an array of objects keyed by header name.
 * Empty lines are skipped and headers are trimmed. Values are coerced to
 * strings so downstream code never has to guard against numbers/nulls.
 */
export function parseCsv(csv: string): RawRecord[] {
  const result = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  return result.data.map((row) => {
    const clean: RawRecord = {};
    for (const [key, value] of Object.entries(row)) {
      if (!key) continue;
      clean[key] = value == null ? '' : String(value).trim();
    }
    return clean;
  });
}

/**
 * Escape a single value so it is safe to embed inside a CSV cell. Any embedded
 * newlines are converted to the literal escape sequence `\n` so each record
 * stays on a single CSV row (per the assignment's CSV-compatibility rule).
 */
export function escapeCsvValue(value: string): string {
  const withEscapedNewlines = value.replace(/\r\n|\r|\n/g, '\\n');
  if (/[",]/.test(withEscapedNewlines)) {
    return `"${withEscapedNewlines.replace(/"/g, '""')}"`;
  }
  return withEscapedNewlines;
}

/** Serialise CRM records back into a valid CSV string with the canonical header. */
export function crmRecordsToCsv(records: CrmRecord[]): string {
  const header = CRM_FIELDS.join(',');
  const rows = records.map((rec) =>
    CRM_FIELDS.map((field) => escapeCsvValue(rec[field] ?? '')).join(','),
  );
  return [header, ...rows].join('\n');
}
