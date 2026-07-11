/**
 * Canonical GrowEasy CRM domain types.
 *
 * These types describe the target shape that every uploaded CSV row must be
 * mapped into, regardless of the source column names / layout.
 */

/** Allowed CRM status values. The AI must map to exactly one of these (or leave blank). */
export const CRM_STATUS_VALUES = [
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE',
] as const;

export type CrmStatus = (typeof CRM_STATUS_VALUES)[number];

/** Allowed data source values. The AI must map to exactly one of these (or leave blank). */
export const DATA_SOURCE_VALUES = [
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
] as const;

export type DataSource = (typeof DATA_SOURCE_VALUES)[number];

/**
 * The GrowEasy CRM record. Every field is optional/blank-able except that a
 * record is only valid when it has at least an email OR a mobile number.
 */
export interface CrmRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus | '';
  crm_note: string;
  data_source: DataSource | '';
  possession_time: string;
  description: string;
}

/** The ordered list of CRM field keys — used for CSV export & table headers. */
export const CRM_FIELDS: (keyof CrmRecord)[] = [
  'created_at',
  'name',
  'email',
  'country_code',
  'mobile_without_country_code',
  'company',
  'city',
  'state',
  'country',
  'lead_owner',
  'crm_status',
  'crm_note',
  'data_source',
  'possession_time',
  'description',
];

/** A raw record parsed from the uploaded CSV (arbitrary columns). */
export type RawRecord = Record<string, string>;

/** A record that the AI could not / should not import, with a reason. */
export interface SkippedRecord {
  rowNumber: number;
  reason: string;
  raw: RawRecord;
}

/** The full result of an import run. */
export interface ImportResult {
  records: CrmRecord[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
  totalRows: number;
  provider: string;
  batches: number;
}
