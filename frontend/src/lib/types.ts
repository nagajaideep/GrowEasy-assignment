/** Shared types mirroring the backend CRM contract. */

export const CRM_FIELDS = [
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
] as const;

export type CrmField = (typeof CRM_FIELDS)[number];

export type CrmRecord = Record<CrmField, string>;

export type RawRecord = Record<string, string>;

export interface SkippedRecord {
  rowNumber: number;
  reason: string;
  raw: RawRecord;
}

export interface ImportResult {
  records: CrmRecord[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
  totalRows: number;
  provider: string;
  batches: number;
}

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

/** Human-friendly labels for CRM columns. */
export const CRM_FIELD_LABELS: Record<CrmField, string> = {
  created_at: 'Created At',
  name: 'Name',
  email: 'Email',
  country_code: 'Code',
  mobile_without_country_code: 'Mobile',
  company: 'Company',
  city: 'City',
  state: 'State',
  country: 'Country',
  lead_owner: 'Lead Owner',
  crm_status: 'Status',
  crm_note: 'Note',
  data_source: 'Data Source',
  possession_time: 'Possession',
  description: 'Description',
};
