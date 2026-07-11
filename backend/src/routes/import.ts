import { Router, Request, Response } from 'express';
import multer from 'multer';
import { env } from '../config/env';
import { parseCsv, crmRecordsToCsv } from '../utils/csv';
import { extractRecords } from '../services/extractor';
import { asyncHandler, HttpError } from '../middleware/errorHandler';
import { RawRecord } from '../types/crm';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
});

export const importRouter = Router();

/**
 * Extract raw CSV rows from a request. Supports:
 *  - multipart/form-data with a `file` field (uploaded CSV)
 *  - application/json with `{ csv: string }`
 *  - application/json with `{ records: RawRecord[] }` (pre-parsed rows)
 */
function extractRowsFromRequest(req: Request): RawRecord[] {
  if (req.file) {
    return parseCsv(req.file.buffer.toString('utf-8'));
  }
  const body = req.body as { csv?: string; records?: RawRecord[] };
  if (body?.csv && typeof body.csv === 'string') {
    return parseCsv(body.csv);
  }
  if (Array.isArray(body?.records)) {
    return body.records;
  }
  throw new HttpError(400, 'No CSV provided. Send a file, { csv }, or { records }.');
}

/**
 * POST /api/import
 * Runs the full AI extraction and returns the structured result as JSON.
 * Optional query: ?format=csv to receive the CRM CSV instead.
 */
importRouter.post(
  '/import',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const rows = extractRowsFromRequest(req);
    if (rows.length === 0) {
      throw new HttpError(400, 'The CSV contained no data rows.');
    }

    const result = await extractRecords(rows);

    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="groweasy-crm.csv"');
      res.send(crmRecordsToCsv(result.records));
      return;
    }

    res.json(result);
  }),
);

/**
 * POST /api/import/stream
 * Same as /import but streams Server-Sent-Event style progress messages while
 * batches are processed, then a final `result` event. The frontend reads this
 * via the fetch streaming API (EventSource can't POST a body).
 */
importRouter.post(
  '/import/stream',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const rows = extractRowsFromRequest(req);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    if (rows.length === 0) {
      send('error', { error: 'The CSV contained no data rows.' });
      res.end();
      return;
    }

    send('start', { totalRows: rows.length });

    try {
      const result = await extractRecords(rows, {
        onProgress: (progress) => send('progress', progress),
      });
      send('result', result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed';
      send('error', { error: message });
    } finally {
      res.end();
    }
  }),
);
