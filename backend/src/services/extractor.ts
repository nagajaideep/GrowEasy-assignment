import { env } from '../config/env';
import { CrmRecord, ImportResult, RawRecord, SkippedRecord } from '../types/crm';
import { hasContact, normalizeRecord } from '../utils/normalize';
import { chunk, delay } from '../utils/chunk';
import { AiProviderClient, createProvider } from './providers';
import { AiExtractionItem } from './providers/types';

export interface BatchProgress {
  batchIndex: number;
  totalBatches: number;
  rowsProcessed: number;
  totalRows: number;
  importedSoFar: number;
  skippedSoFar: number;
  status: 'processing' | 'batch_complete' | 'batch_failed';
  message?: string;
}

export interface ExtractOptions {
  provider?: AiProviderClient;
  batchSize?: number;
  maxRetries?: number;
  onProgress?: (progress: BatchProgress) => void;
}

/**
 * Run one AI batch with retries + exponential backoff. Throws only after the
 * final retry fails, so the caller can decide how to record the failure.
 */
async function extractBatchWithRetry(
  provider: AiProviderClient,
  rows: RawRecord[],
  maxRetries: number,
): Promise<AiExtractionItem[]> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await provider.extract(rows);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const backoff = Math.min(2 ** attempt * 250, 4000);
        await delay(backoff);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Convert a batch of AI items + their source rows into validated CRM records
 * and skip entries, enforcing every CRM rule via the normaliser.
 */
function reconcileBatch(
  items: AiExtractionItem[],
  rows: RawRecord[],
  rowOffset: number,
): { records: CrmRecord[]; skipped: SkippedRecord[] } {
  const records: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];

  rows.forEach((raw, i) => {
    const rowNumber = rowOffset + i + 1;
    const item = items[i];

    if (!item || item.skip) {
      skipped.push({
        rowNumber,
        reason: item?.reason ?? 'no email or mobile',
        raw,
      });
      return;
    }

    const record = normalizeRecord(item as Partial<Record<keyof CrmRecord, unknown>>);

    // Final safety net for the skip-invalid rule, even if the AI ignored it.
    if (!hasContact(record)) {
      skipped.push({ rowNumber, reason: 'no email or mobile', raw });
      return;
    }

    records.push(record);
  });

  return { records, skipped };
}

/**
 * Orchestrate the full extraction: batch the rows, call the AI provider per
 * batch (with retry), normalise/validate outputs, and stream progress.
 */
export async function extractRecords(
  rows: RawRecord[],
  options: ExtractOptions = {},
): Promise<ImportResult> {
  const provider = options.provider ?? createProvider();
  const batchSize = options.batchSize ?? env.batchSize;
  const maxRetries = options.maxRetries ?? env.maxRetries;

  const batches = chunk(rows, batchSize);
  const allRecords: CrmRecord[] = [];
  const allSkipped: SkippedRecord[] = [];
  let rowsProcessed = 0;

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const rowOffset = b * batchSize;

    options.onProgress?.({
      batchIndex: b,
      totalBatches: batches.length,
      rowsProcessed,
      totalRows: rows.length,
      importedSoFar: allRecords.length,
      skippedSoFar: allSkipped.length,
      status: 'processing',
    });

    try {
      const items = await extractBatchWithRetry(provider, batch, maxRetries);
      const { records, skipped } = reconcileBatch(items, batch, rowOffset);
      allRecords.push(...records);
      allSkipped.push(...skipped);
      rowsProcessed += batch.length;

      options.onProgress?.({
        batchIndex: b,
        totalBatches: batches.length,
        rowsProcessed,
        totalRows: rows.length,
        importedSoFar: allRecords.length,
        skippedSoFar: allSkipped.length,
        status: 'batch_complete',
      });
    } catch (err) {
      // A permanently failed batch: mark all its rows as skipped rather than
      // aborting the whole import.
      const message = err instanceof Error ? err.message : String(err);
      batch.forEach((raw, i) => {
        allSkipped.push({
          rowNumber: rowOffset + i + 1,
          reason: `AI batch failed after ${maxRetries} attempts: ${message}`,
          raw,
        });
      });
      rowsProcessed += batch.length;

      options.onProgress?.({
        batchIndex: b,
        totalBatches: batches.length,
        rowsProcessed,
        totalRows: rows.length,
        importedSoFar: allRecords.length,
        skippedSoFar: allSkipped.length,
        status: 'batch_failed',
        message,
      });
    }
  }

  return {
    records: allRecords,
    skipped: allSkipped,
    totalImported: allRecords.length,
    totalSkipped: allSkipped.length,
    totalRows: rows.length,
    provider: provider.name,
    batches: batches.length,
  };
}
