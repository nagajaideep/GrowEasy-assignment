/** Maps CRM status enum -> GrowEasy display label + pill colours. */
const STATUS_META: Record<string, { label: string; className: string }> = {
  GOOD_LEAD_FOLLOW_UP: {
    label: 'Good Lead',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  SALE_DONE: {
    label: 'Sale Done',
    className: 'bg-accent-100 text-accent-700 dark:bg-accent-950 dark:text-accent-300',
  },
  DID_NOT_CONNECT: {
    label: 'Did Not Connect',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  BAD_LEAD: {
    label: 'Bad Lead',
    className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status];
  if (!meta) {
    return (
      <span className="inline-block whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        Not Set
      </span>
    );
  }
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}
