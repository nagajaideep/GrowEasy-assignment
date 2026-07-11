import { describe, it, expect } from 'vitest';
import { extractRecords } from '../services/extractor';
import { MockProvider } from '../services/providers/mock';
import { AiExtractionItem, AiProviderClient } from '../services/providers/types';
import { RawRecord } from '../types/crm';

const mock = new MockProvider();

describe('extractRecords with the heuristic provider', () => {
  it('maps arbitrary column names into CRM records', async () => {
    const rows: RawRecord[] = [
      {
        'Full Name': 'John Doe',
        'E-mail Address': 'john@example.com',
        'Contact Number': '+91 9876543210',
        'Lead Status': 'Interested, please follow up',
        Company: 'GrowEasy',
      },
    ];
    const result = await extractRecords(rows, { provider: mock, batchSize: 10 });
    expect(result.totalImported).toBe(1);
    expect(result.records[0].name).toBe('John Doe');
    expect(result.records[0].email).toBe('john@example.com');
    expect(result.records[0].country_code).toBe('+91');
    expect(result.records[0].mobile_without_country_code).toBe('9876543210');
    expect(result.records[0].crm_status).toBe('GOOD_LEAD_FOLLOW_UP');
  });

  it('skips rows lacking both email and mobile', async () => {
    const rows: RawRecord[] = [{ Name: 'No Contact', City: 'Mumbai' }];
    const result = await extractRecords(rows, { provider: mock });
    expect(result.totalImported).toBe(0);
    expect(result.totalSkipped).toBe(1);
    expect(result.skipped[0].reason).toMatch(/no email or mobile/i);
  });

  it('keeps the first email/mobile and appends extras to crm_note', async () => {
    const rows: RawRecord[] = [
      {
        Name: 'Multi',
        Emails: 'first@x.com; second@y.com',
        Phones: '+91 9876543210 / +91 9998887776',
      },
    ];
    const result = await extractRecords(rows, { provider: mock });
    const rec = result.records[0];
    expect(rec.email).toBe('first@x.com');
    expect(rec.crm_note).toContain('second@y.com');
    expect(rec.crm_note).toContain('9998887776');
  });

  it('processes rows in multiple batches', async () => {
    const rows: RawRecord[] = Array.from({ length: 25 }, (_, i) => ({
      Name: `User ${i}`,
      Email: `user${i}@x.com`,
    }));
    const progressEvents: number[] = [];
    const result = await extractRecords(rows, {
      provider: mock,
      batchSize: 10,
      onProgress: (p) => progressEvents.push(p.batchIndex),
    });
    expect(result.batches).toBe(3);
    expect(result.totalImported).toBe(25);
    expect(progressEvents.length).toBeGreaterThan(0);
  });
});

describe('extractRecords retry + failure handling', () => {
  it('retries a flaky provider and eventually succeeds', async () => {
    let calls = 0;
    const flaky: AiProviderClient = {
      name: 'flaky',
      async extract(rows): Promise<AiExtractionItem[]> {
        calls++;
        if (calls < 2) throw new Error('transient');
        return rows.map((r) => ({ name: r.Name, email: r.Email }));
      },
    };
    const rows: RawRecord[] = [{ Name: 'A', Email: 'a@x.com' }];
    const result = await extractRecords(rows, { provider: flaky, maxRetries: 3 });
    expect(calls).toBe(2);
    expect(result.totalImported).toBe(1);
  });

  it('marks a batch as skipped when all retries fail', async () => {
    const broken: AiProviderClient = {
      name: 'broken',
      async extract(): Promise<AiExtractionItem[]> {
        throw new Error('permanent');
      },
    };
    const rows: RawRecord[] = [{ Name: 'A', Email: 'a@x.com' }];
    const result = await extractRecords(rows, { provider: broken, maxRetries: 2 });
    expect(result.totalImported).toBe(0);
    expect(result.totalSkipped).toBe(1);
    expect(result.skipped[0].reason).toMatch(/AI batch failed/i);
  });
});
