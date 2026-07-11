'use client';

import { ReactNode } from 'react';

interface NavItem {
  label: string;
  icon: ReactNode;
  active?: boolean;
}

function Icon({ path }: { path: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const MAIN: NavItem[] = [
  { label: 'Dashboard', icon: <Icon path="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" /> },
  { label: 'Generate Leads', icon: <Icon path="M12 2v20M2 12h20" /> },
  { label: 'Manage Leads', icon: <Icon path="M4 6h16M4 12h16M4 18h10" /> },
  { label: 'Engage Leads', icon: <Icon path="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
];

const CONTROL: NavItem[] = [
  { label: 'Team Members', icon: <Icon path="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /> },
  { label: 'Lead Sources', icon: <Icon path="M4 4h16v4H4zM4 12h16v4H4zM4 20h10" />, active: true },
  { label: 'Ad Accounts', icon: <Icon path="M3 3v18h18M18 9l-5 5-3-3-4 4" /> },
  { label: 'WhatsApp Account', icon: <Icon path="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /> },
  { label: 'Tele Calling', icon: <Icon path="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /> },
  { label: 'CRM Fields', icon: <Icon path="M4 4h16v16H4zM4 9h16M9 4v16" /> },
  { label: 'API Center', icon: <Icon path="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /> },
];

function NavList({ items }: { items: NavItem[] }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.label}>
          <span
            className={[
              'flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
              item.active
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/60',
            ].join(' ')}
          >
            {item.icon}
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-5 dark:border-slate-800 dark:bg-slate-900 lg:flex">
      <div className="flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-sm font-bold text-white">G</span>
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">GrowEasy</span>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 text-sm font-bold text-white">V</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">VK Test</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Owner</p>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto">
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Main</p>
          <NavList items={MAIN} />
        </div>
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Control Center</p>
          <NavList items={CONTROL} />
        </div>
      </nav>

      <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
        <span className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          <Icon path="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
          Business Center
        </span>
      </div>
    </aside>
  );
}
