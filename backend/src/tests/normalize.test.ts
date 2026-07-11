import { describe, it, expect } from 'vitest';
import {
  normalizeStatus,
  normalizeDataSource,
  normalizeDate,
  hasContact,
  normalizeRecord,
} from '../utils/normalize';

describe('normalizeStatus', () => {
  it('accepts valid statuses case-insensitively', () => {
    expect(normalizeStatus('sale_done')).toBe('SALE_DONE');
    expect(normalizeStatus('GOOD_LEAD_FOLLOW_UP')).toBe('GOOD_LEAD_FOLLOW_UP');
  });
  it('rejects unknown statuses', () => {
    expect(normalizeStatus('maybe')).toBe('');
  });
});

describe('normalizeDataSource', () => {
  it('normalises spacing and case', () => {
    expect(normalizeDataSource('Eden Park')).toBe('eden_park');
  });
  it('rejects unknown sources', () => {
    expect(normalizeDataSource('facebook')).toBe('');
  });
});

describe('normalizeDate', () => {
  it('keeps parseable dates', () => {
    expect(normalizeDate('2026-05-13 14:20:48')).toBe('2026-05-13 14:20:48');
  });
  it('drops unparseable values', () => {
    expect(normalizeDate('not a date')).toBe('');
  });
});

describe('hasContact', () => {
  it('is true with an email', () => {
    expect(hasContact({ email: 'a@b.com', mobile_without_country_code: '' })).toBe(true);
  });
  it('is true with a mobile', () => {
    expect(hasContact({ email: '', mobile_without_country_code: '999' })).toBe(true);
  });
  it('is false with neither', () => {
    expect(hasContact({ email: '', mobile_without_country_code: '' })).toBe(false);
  });
});

describe('normalizeRecord', () => {
  it('fills all fields and enforces enums', () => {
    const rec = normalizeRecord({
      name: 'Jane',
      email: 'jane@x.com',
      crm_status: 'won',
      data_source: 'Meridian Tower',
      created_at: 'garbage',
      extra: 'ignored',
    });
    expect(rec.name).toBe('Jane');
    expect(rec.crm_status).toBe('SALE_DONE');
    expect(rec.data_source).toBe('meridian_tower');
    expect(rec.created_at).toBe('');
    expect(rec).not.toHaveProperty('extra');
  });
});
