import { BatchProgress, ImportResult, RawRecord } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export interface StreamCallbacks {
  onStart?: (info: { totalRows: number }) => void;
  onProgress?: (progress: BatchProgress) => void;
  onResult?: (result: ImportResult) => void;
  onError?: (message: string) => void;
}

/** Basic health probe used to surface the active AI provider in the UI. */
export async function fetchHealth(): Promise<{ status: string; provider: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) return null;
    return (await res.json()) as { status: string; provider: string };
  } catch {
    return null;
  }
}

/**
 * Stream an import via the SSE endpoint. We POST the parsed rows and read the
 * text/event-stream response incrementally so we can render live progress.
 */
export async function importCsvStream(
  rows: RawRecord[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/import/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: rows }),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const dispatch = (rawEvent: string) => {
    const lines = rawEvent.split('\n');
    let event = 'message';
    let data = '';
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (!data) return;
    const payload = JSON.parse(data);
    switch (event) {
      case 'start':
        callbacks.onStart?.(payload);
        break;
      case 'progress':
        callbacks.onProgress?.(payload as BatchProgress);
        break;
      case 'result':
        callbacks.onResult?.(payload as ImportResult);
        break;
      case 'error':
        callbacks.onError?.(payload.error ?? 'Unknown error');
        break;
    }
  };

  // Read the stream, splitting on the SSE record delimiter (blank line).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      if (rawEvent.trim()) dispatch(rawEvent);
    }
  }
  if (buffer.trim()) dispatch(buffer);
}

/** Non-streaming import — kept as a fallback if streaming is unavailable. */
export async function importCsv(rows: RawRecord[]): Promise<ImportResult> {
  const res = await fetch(`${API_BASE}/api/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: rows }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return (await res.json()) as ImportResult;
}
