'use client';

import { ReactNode, useRef, useState } from 'react';

export interface Column<T> {
  key: string;
  label: ReactNode;
  /** Custom cell renderer; defaults to String(row[key]). */
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  minWidth?: number;
}

interface VirtualTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  /** Max height of the scroll area in px. */
  maxHeight?: number;
  rowHeight?: number;
  emptyMessage?: string;
}

const OVERSCAN = 8;

/**
 * A table with sticky headers, horizontal + vertical scrolling and row
 * virtualization. Only the rows within (and near) the viewport are rendered,
 * so it stays smooth even with tens of thousands of rows.
 */
export function VirtualTable<T>({
  columns,
  rows,
  rowKey,
  maxHeight = 460,
  rowHeight = 44,
  emptyMessage = 'No rows to display.',
}: VirtualTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(maxHeight);

  const total = rows.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + OVERSCAN * 2;
  const endIndex = Math.min(total, startIndex + visibleCount);

  const topPad = startIndex * rowHeight;
  const bottomPad = Math.max(0, (total - endIndex) * rowHeight);
  const visibleRows = rows.slice(startIndex, endIndex);

  return (
    <div
      ref={scrollRef}
      className="scroll-area relative overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      style={{ maxHeight }}
      onScroll={(e) => {
        setScrollTop(e.currentTarget.scrollTop);
        setViewportHeight(e.currentTarget.clientHeight);
      }}
    >
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="whitespace-nowrap border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                style={{ minWidth: col.minWidth }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {total === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-slate-400 dark:text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
          {topPad > 0 && <tr style={{ height: topPad }} aria-hidden />}
          {visibleRows.map((row, i) => {
            const index = startIndex + i;
            return (
              <tr
                key={rowKey(row, index)}
                className="border-b border-slate-100 transition hover:bg-brand-50/60 dark:border-slate-800 dark:hover:bg-slate-800/60"
                style={{ height: rowHeight }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={[
                      'max-w-xs truncate px-4 py-2 text-slate-700 dark:text-slate-200',
                      col.className ?? '',
                    ].join(' ')}
                    title={
                      col.render
                        ? undefined
                        : String((row as Record<string, unknown>)[col.key] ?? '')
                    }
                  >
                    {col.render
                      ? col.render(row, index)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
          {bottomPad > 0 && <tr style={{ height: bottomPad }} aria-hidden />}
        </tbody>
      </table>
    </div>
  );
}
