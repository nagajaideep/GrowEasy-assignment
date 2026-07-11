import { RawRecord } from '../../types/crm';
import { AiExtractionItem, AiProviderClient } from './types';

/**
 * Deterministic, key-free "AI" provider.
 *
 * It mimics the mapping the real LLM performs using fuzzy header matching and
 * regex-based value extraction. This is NOT meant to rival a real model, but it
 * lets the entire app run end-to-end in local dev / CI / reviewer environments
 * where no API key is configured. The behaviour mirrors the CRM rules exactly
 * (allowed enums, single email/mobile, note aggregation, skip-invalid).
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?\d[\d\s().-]{6,}\d)/g;

/** Candidate header substrings for each CRM field, in priority order. */
const FIELD_HINTS: Record<string, string[]> = {
  created_at: ['created', 'date', 'timestamp', 'time', 'lead date', 'created_time'],
  name: ['full name', 'name', 'contact', 'lead name', 'customer', 'client'],
  email: ['email', 'e-mail', 'mail'],
  country_code: ['country code', 'country_code', 'dial', 'isd'],
  mobile_without_country_code: ['mobile', 'phone', 'contact number', 'cell', 'whatsapp', 'number', 'tel'],
  company: ['company', 'organisation', 'organization', 'business', 'firm'],
  city: ['city', 'town'],
  state: ['state', 'province', 'region'],
  country: ['country', 'nation'],
  lead_owner: ['owner', 'agent', 'assigned', 'salesperson', 'rep'],
  crm_status: ['status', 'stage', 'disposition', 'lead status'],
  crm_note: ['note', 'remark', 'comment', 'feedback', 'message'],
  data_source: ['source', 'campaign', 'channel', 'project'],
  possession_time: ['possession', 'handover', 'ready to move'],
  description: ['description', 'details', 'about'],
};

const STATUS_MAP: { keywords: string[]; value: string }[] = [
  { keywords: ['won', 'closed', 'sale', 'purchased', 'deal done', 'converted'], value: 'SALE_DONE' },
  { keywords: ['not interested', 'junk', 'invalid', 'do not', 'bad', 'lost'], value: 'BAD_LEAD' },
  { keywords: ['no answer', 'not reachable', 'busy', 'voicemail', 'did not connect', 'unreachable', 'ringing'], value: 'DID_NOT_CONNECT' },
  { keywords: ['interested', 'follow', 'call back', 'callback', 'warm', 'good', 'demo'], value: 'GOOD_LEAD_FOLLOW_UP' },
];

const DATA_SOURCES = ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots'];

function findColumn(headers: string[], hints: string[]): string | undefined {
  const lower = headers.map((h) => ({ raw: h, low: h.toLowerCase() }));
  for (const hint of hints) {
    const exact = lower.find((h) => h.low === hint);
    if (exact) return exact.raw;
  }
  for (const hint of hints) {
    const partial = lower.find((h) => h.low.includes(hint));
    if (partial) return partial.raw;
  }
  return undefined;
}

function mapStatus(value: string): string {
  const v = value.toLowerCase();
  for (const { keywords, value: mapped } of STATUS_MAP) {
    if (keywords.some((k) => v.includes(k))) return mapped;
  }
  return '';
}

function mapDataSource(value: string): string {
  const v = value.toLowerCase().replace(/\s+/g, '_');
  return DATA_SOURCES.find((s) => v.includes(s)) ?? '';
}

function splitPhone(raw: string): { code: string; number: string } {
  const trimmed = raw.trim();

  // Preferred: an explicit separator between the +code and the number,
  // e.g. "+91 9876543210" or "+91-9876543210".
  const separated = trimmed.match(/^(\+\d{1,4})[\s.\-]+(.+)$/);
  if (separated) {
    return { code: separated[1], number: separated[2].replace(/\D/g, '') };
  }

  const digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    const rest = digits.slice(1);
    // Assume the local number is the last 10 digits; anything before is the code.
    if (rest.length > 10) {
      return { code: `+${rest.slice(0, rest.length - 10)}`, number: rest.slice(-10) };
    }
    return { code: '', number: rest };
  }
  return { code: '', number: digits };
}

export class MockProvider implements AiProviderClient {
  readonly name = 'mock:heuristic';

  async extract(rows: RawRecord[]): Promise<AiExtractionItem[]> {
    if (rows.length === 0) return [];
    const headers = Object.keys(rows[0]);
    const cols: Record<string, string | undefined> = {};
    for (const [field, hints] of Object.entries(FIELD_HINTS)) {
      cols[field] = findColumn(headers, hints);
    }

    return rows.map((row) => this.mapRow(row, cols));
  }

  private mapRow(
    row: RawRecord,
    cols: Record<string, string | undefined>,
  ): AiExtractionItem {
    const allText = Object.values(row).join(' ');
    const notes: string[] = [];

    // Emails: first goes to the field, rest to notes.
    const emails = Array.from(allText.matchAll(EMAIL_RE)).map((m) => m[0]);
    const uniqueEmails = [...new Set(emails)];
    const email = uniqueEmails[0] ?? '';
    if (uniqueEmails.length > 1) notes.push(`Other emails: ${uniqueEmails.slice(1).join(', ')}`);

    // Phones: pull from the mobile column first, then anywhere. Exclude emails.
    const phoneSource = cols.mobile_without_country_code ? row[cols.mobile_without_country_code] : allText;
    const rawPhones = Array.from((phoneSource ?? '').matchAll(PHONE_RE))
      .map((m) => m[0].trim())
      .filter((p) => p.replace(/\D/g, '').length >= 7);
    const uniquePhones = [...new Set(rawPhones)];
    const primaryPhone = uniquePhones[0] ? splitPhone(uniquePhones[0]) : { code: '', number: '' };
    if (uniquePhones.length > 1) notes.push(`Other numbers: ${uniquePhones.slice(1).join(', ')}`);

    let countryCode = primaryPhone.code;
    if (!countryCode && cols.country_code) countryCode = row[cols.country_code] ?? '';

    // Skip rule: no email AND no mobile.
    if (!email && !primaryPhone.number) {
      return { skip: true, reason: 'no email or mobile' };
    }

    const noteCol = cols.crm_note ? row[cols.crm_note] : '';
    if (noteCol) notes.unshift(noteCol);

    const get = (field: string) => (cols[field] ? row[cols[field] as string] ?? '' : '');

    return {
      created_at: get('created_at'),
      name: get('name'),
      email,
      country_code: countryCode,
      mobile_without_country_code: primaryPhone.number,
      company: get('company'),
      city: get('city'),
      state: get('state'),
      country: get('country'),
      lead_owner: get('lead_owner'),
      crm_status: mapStatus(get('crm_status')),
      crm_note: notes.join(' | ').replace(/\r\n|\r|\n/g, '\\n'),
      data_source: mapDataSource(get('data_source')),
      possession_time: get('possession_time'),
      description: get('description'),
    };
  }
}
