import {
  CRM_FIELDS,
  CRM_STATUS_VALUES,
  CrmRecord,
  CrmStatus,
  DATA_SOURCE_VALUES,
  DataSource,
} from '../types/crm';

/**
 * Post-processing / validation layer applied to every record returned by the
 * AI. The LLM does the intelligent mapping, but this layer guarantees the
 * output actually conforms to the strict CRM contract even if the model drifts.
 */

const EMPTY_RECORD: CrmRecord = {
  created_at: '',
  name: '',
  email: '',
  country_code: '',
  mobile_without_country_code: '',
  company: '',
  city: '',
  state: '',
  country: '',
  lead_owner: '',
  crm_status: '',
  crm_note: '',
  data_source: '',
  possession_time: '',
  description: '',
};

function str(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

/**
 * Free-text status keywords mapped to canonical CRM statuses. Used as a safety
 * net when the model (or a heuristic) returns a human-readable status instead
 * of the exact enum value.
 */
const STATUS_KEYWORDS: { keywords: string[]; value: CrmStatus }[] = [
  { keywords: ['sale_done', 'won', 'closed', 'purchased', 'deal done', 'converted', 'sale done'], value: 'SALE_DONE' },
  { keywords: ['bad_lead', 'not interested', 'junk', 'invalid', 'do not', 'bad lead', 'lost'], value: 'BAD_LEAD' },
  { keywords: ['did_not_connect', 'no answer', 'not reachable', 'busy', 'voicemail', 'unreachable', 'did not connect', 'ringing'], value: 'DID_NOT_CONNECT' },
  { keywords: ['good_lead_follow_up', 'interested', 'follow up', 'follow-up', 'call back', 'callback', 'warm', 'good lead'], value: 'GOOD_LEAD_FOLLOW_UP' },
];

/** Coerce an arbitrary AI value into a valid CrmStatus or empty string. */
export function normalizeStatus(value: unknown): CrmStatus | '' {
  const upper = str(value).toUpperCase();
  if ((CRM_STATUS_VALUES as readonly string[]).includes(upper)) return upper as CrmStatus;

  const lower = str(value).toLowerCase();
  if (!lower) return '';
  for (const { keywords, value: mapped } of STATUS_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return mapped;
  }
  return '';
}

/** Coerce an arbitrary AI value into a valid DataSource or empty string. */
export function normalizeDataSource(value: unknown): DataSource | '' {
  const v = str(value).toLowerCase().replace(/\s+/g, '_');
  return (DATA_SOURCE_VALUES as readonly string[]).includes(v) ? (v as DataSource) : '';
}

/**
 * Normalise created_at into something `new Date()` can parse. If the value is
 * unparseable it is dropped (left blank) rather than emitting an invalid date.
 */
export function normalizeDate(value: unknown): string {
  const v = str(value);
  if (!v) return '';
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? '' : v;
}

/** True when the record carries at least an email or a mobile number. */
export function hasContact(record: Pick<CrmRecord, 'email' | 'mobile_without_country_code'>): boolean {
  return Boolean(str(record.email) || str(record.mobile_without_country_code));
}

/**
 * Take a loosely-shaped object (from the AI) and produce a fully-formed,
 * rule-compliant CrmRecord. Unknown keys are ignored; missing keys default to
 * empty strings.
 */
export function normalizeRecord(input: Partial<Record<keyof CrmRecord, unknown>>): CrmRecord {
  const record: CrmRecord = { ...EMPTY_RECORD };

  for (const field of CRM_FIELDS) {
    if (field === 'crm_status' || field === 'data_source') continue;
    record[field] = str(input[field]);
  }

  record.created_at = normalizeDate(input.created_at);
  record.crm_status = normalizeStatus(input.crm_status);
  record.data_source = normalizeDataSource(input.data_source);

  return record;
}
