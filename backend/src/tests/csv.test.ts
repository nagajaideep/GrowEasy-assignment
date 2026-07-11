import { describe, it, expect } from 'vitest';
import { parseCsv, escapeCsvValue, crmRecordsToCsv } from '../utils/csv';
import { CrmRecord } from '../types/crm';

describe('parseCsv', () => {
  it('parses headers and rows into trimmed objects', () => {
    const csv = 'Name , Email\nJohn Doe, john@example.com\n';
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ Name: 'John Doe', Email: 'john@example.com' });
  });

  it('skips empty lines', () => {
    const csv = 'a,b\n1,2\n\n\n3,4\n';
    expect(parseCsv(csv)).toHaveLength(2);
  });
});

describe('escapeCsvValue', () => {
  it('converts newlines to literal \\n', () => {
    expect(escapeCsvValue('line1\nline2')).toBe('line1\\nline2');
  });

  it('quotes values containing commas', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"');
  });

  it('escapes embedded quotes', () => {
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
  });
});

describe('crmRecordsToCsv', () => {
  it('emits the canonical header and a single row per record', () => {
    const rec: CrmRecord = {
      created_at: '2026-05-13 14:20:48',
      name: 'John Doe',
      email: 'john@example.com',
      country_code: '+91',
      mobile_without_country_code: '9876543210',
      company: 'GrowEasy',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      lead_owner: 'test@gmail.com',
      crm_status: 'GOOD_LEAD_FOLLOW_UP',
      crm_note: 'note',
      data_source: '',
      possession_time: '',
      description: '',
    };
    const csv = crmRecordsToCsv([rec]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('created_at');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('John Doe');
  });
});
