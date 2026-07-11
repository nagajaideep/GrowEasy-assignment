import { RawRecord } from '@/lib/types';
import { Column, VirtualTable } from './VirtualTable';

export function PreviewTable({ headers, rows }: { headers: string[]; rows: RawRecord[] }) {
  const columns: Column<RawRecord>[] = headers.map((h) => ({
    key: h,
    label: h,
    minWidth: 140,
  }));

  return (
    <VirtualTable
      columns={columns}
      rows={rows}
      rowKey={(_, i) => i}
      emptyMessage="This CSV has no data rows."
    />
  );
}
