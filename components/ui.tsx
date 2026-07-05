import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  CLIENT_STATUS,
  CONTRACT_STATUS,
  invoiceTone,
} from '@/lib/format';
import type { ClientStatus, ContractStatus, InvoiceStatus } from '@/lib/types';

type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neu' | 'pur';

export function Pill({ tone = 'neu', dot = true, plain = false, children }: {
  tone?: Tone;
  dot?: boolean;
  plain?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`pill tone-${tone}${plain ? ' plain' : ''}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

export function ClientStatusPill({ status }: { status: ClientStatus }) {
  const s = CLIENT_STATUS[status] ?? CLIENT_STATUS.prospective;
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function ContractStatusPill({ status }: { status: ContractStatus }) {
  const s = CONTRACT_STATUS[status] ?? CONTRACT_STATUS.draft;
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function InvoiceStatusPill({ status, dueDate }: { status: InvoiceStatus; dueDate: string | null }) {
  const s = invoiceTone(status, dueDate);
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export interface Crumb {
  href?: string;
  label: string;
}

/**
 * Lean single-bar header (48px): crumbs flow into the title, subtitle sits
 * inline and truncates, actions right. No stacked hero block.
 */
export function PageHeader({ title, subtitle, crumbs, actions, meta }: {
  title: ReactNode;
  subtitle?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  const parents = crumbs && crumbs.length > 1 ? crumbs.slice(0, -1) : [];
  return (
    <header className="no-print sticky top-0 z-10 flex h-12 flex-none items-center gap-3 border-b border-border bg-bg/90 px-5 backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {parents.map((c, i) => (
          <span key={i} className="flex min-w-0 flex-none items-center gap-2 text-[13px] text-faint">
            {c.href ? (
              <Link href={c.href} className="max-w-[180px] truncate transition-colors duration-100 hover:text-fg">{c.label}</Link>
            ) : (
              <span className="max-w-[180px] truncate">{c.label}</span>
            )}
            <span className="select-none text-border-strong">/</span>
          </span>
        ))}
        <h1 className="t-h3 min-w-0 truncate">{title}</h1>
        {meta && <span className="flex-none">{meta}</span>}
        {subtitle && (
          <span className="hidden min-w-0 items-center gap-2 text-[12.5px] text-faint md:flex">
            <span className="select-none">·</span>
            <span className="truncate">{subtitle}</span>
          </span>
        )}
      </div>
      {actions && <div className="flex flex-none items-center gap-1.5">{actions}</div>}
    </header>
  );
}

export function KPI({ label, value, sub, tone }: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="card px-3.5 py-3">
      <div className="t-eyebrow flex items-center gap-1.5">
        {tone && <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: `var(--${toneVar(tone)})` }} />}
        {label}
      </div>
      <div className="num t-h1 mt-1.5">{value}</div>
      {sub && <div className="t-small mt-0.5 text-faint">{sub}</div>}
    </div>
  );
}

function toneVar(tone: Tone): string {
  return { ok: 'ok-solid', warn: 'warn-solid', bad: 'bad-solid', info: 'info-solid', neu: 'neu-solid', pur: 'pur-solid' }[tone];
}

export function EmptyState({ icon, title, hint, action }: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border-strong px-6 py-14 text-center">
      {icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-panel-2 text-faint">
          {icon}
        </div>
      )}
      <h3 className="t-h3">{title}</h3>
      {hint && <p className="t-small mt-1 max-w-sm text-pretty text-faint">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Section({ title, actions, children, sub }: {
  title: string;
  sub?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="t-h3">{title}</h2>
          {sub && <span className="t-small text-faint">{sub}</span>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Definition-list style key/value used across detail pages. */
export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="t-eyebrow">{label}</dt>
      <dd className="t-body text-fg">{children}</dd>
    </div>
  );
}
