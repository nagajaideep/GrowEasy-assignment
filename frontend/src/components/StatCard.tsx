type Tone = 'brand' | 'amber' | 'slate' | 'blue';

const TONES: Record<Tone, string> = {
  brand: 'text-brand-600 dark:text-brand-400',
  amber: 'text-amber-600 dark:text-amber-400',
  slate: 'text-slate-700 dark:text-slate-200',
  blue: 'text-blue-600 dark:text-blue-400',
};

export function StatCard({ label, value, tone = 'slate' }: { label: string; value: number | string; tone?: Tone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${TONES[tone]}`}>{value}</p>
    </div>
  );
}
