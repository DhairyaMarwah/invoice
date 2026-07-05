import type {
  BillingCycle,
  ClientStatus,
  ContractStatus,
  InvoiceStatus,
  PaymentMethod,
  SalesStage,
  ClientCategory,
  ClientSegment,
  ContactRole,
  ActivityKind,
  ApprovalStatus,
  ApprovalKind,
} from './types';

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD'];

const CURRENCY_LOCALE: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  AED: 'en-AE',
  SGD: 'en-SG',
  AUD: 'en-AU',
  CAD: 'en-CA',
};

export function money(amount: number, currency = 'INR'): string {
  const cur = currency || 'INR';
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[cur] ?? 'en-US', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 2,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount || 0);
  } catch {
    return `${cur} ${(amount || 0).toLocaleString()}`;
  }
}

/** Compact money for KPI tiles, e.g. ₹12.4L / $1.2M */
export function moneyCompact(amount: number, currency = 'INR'): string {
  const cur = currency || 'INR';
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[cur] ?? 'en-US', {
      style: 'currency',
      currency: cur,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount || 0);
  } catch {
    return money(amount, cur);
  }
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

// ---- Labels + tones (tone class drives the pill colour) ----
type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neu' | 'pur';

export const CLIENT_STATUS: Record<ClientStatus, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'ok' },
  prospective: { label: 'Prospective', tone: 'info' },
  not_engaged: { label: 'Not Engaged', tone: 'warn' },
  inactive: { label: 'Inactive', tone: 'neu' },
  past: { label: 'Past', tone: 'pur' },
};

export const CONTRACT_STATUS: Record<ContractStatus, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'ok' },
  draft: { label: 'Draft', tone: 'neu' },
  expired: { label: 'Expired', tone: 'warn' },
  terminated: { label: 'Terminated', tone: 'bad' },
};

export const BILLING_CYCLE: Record<BillingCycle, { label: string; short: string }> = {
  annual: { label: 'Annual', short: '/yr' },
  monthly: { label: 'Monthly', short: '/mo' },
  weekly: { label: 'Weekly', short: '/wk' },
  one_time: { label: 'One-time', short: '' },
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  card: 'Card',
  cheque: 'Cheque',
  cash: 'Cash',
  other: 'Other',
};

export function invoiceTone(status: InvoiceStatus, dueDate: string | null): {
  label: string;
  tone: Tone;
} {
  if (status === 'paid') return { label: 'Paid', tone: 'ok' };
  const d = daysUntil(dueDate);
  if (d !== null && d < 0) return { label: 'Overdue', tone: 'bad' };
  return { label: 'Unpaid', tone: 'warn' };
}

/** Annualised value of a contract, for recurring-revenue reporting. */
export function annualized(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'annual': return amount;
    case 'monthly': return amount * 12;
    case 'weekly': return amount * 52;
    case 'one_time': return 0; // not recurring
  }
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ---- CRM / sales ----
/** The 8-stage sales funnel, in pipeline order. */
export const SALES_STAGE: Record<SalesStage, { label: string; short: string; tone: Tone; order: number; open: boolean }> = {
  untouched: { label: 'Untouched', short: 'Untouched', tone: 'neu', order: 0, open: true },
  communication_started: { label: 'Communication Started', short: 'Comms Started', tone: 'info', order: 1, open: true },
  active_communication: { label: 'Active Communication', short: 'Active Comms', tone: 'info', order: 2, open: true },
  physical_meetings: { label: 'Physical Meetings', short: 'Meetings', tone: 'pur', order: 3, open: true },
  sales_cycle: { label: 'Sales Cycle in Motion', short: 'Sales Cycle', tone: 'warn', order: 4, open: true },
  active_customer: { label: 'Active Customer', short: 'Active', tone: 'ok', order: 5, open: false },
  past_customer: { label: 'Past Customer', short: 'Past', tone: 'neu', order: 6, open: false },
  dropped: { label: 'Dropped Customer', short: 'Dropped', tone: 'bad', order: 7, open: false },
};

export const SALES_STAGE_ORDER: SalesStage[] = (Object.keys(SALES_STAGE) as SalesStage[])
  .sort((a, b) => SALES_STAGE[a].order - SALES_STAGE[b].order);

export const CLIENT_CATEGORY: Record<ClientCategory, string> = {
  government: 'Government',
  private: 'Private',
};

export const CLIENT_SEGMENT: Record<ClientSegment, { label: string; tone: Tone }> = {
  university: { label: 'University', tone: 'info' },
  college: { label: 'College', tone: 'pur' },
  edtech: { label: 'EdTech', tone: 'warn' },
  k12: { label: 'K12', tone: 'ok' },
};

export const CONTACT_ROLE: Record<ContactRole, string> = {
  poc: 'Point of Contact',
  promoter: 'Promoter / Leadership',
  accounts: 'Accounts POC',
  other: 'Other',
};

export const ACTIVITY_KIND: Record<ActivityKind, { label: string; tone: Tone }> = {
  note: { label: 'Note', tone: 'neu' },
  call: { label: 'Call', tone: 'info' },
  email: { label: 'Email', tone: 'info' },
  meeting: { label: 'Meeting', tone: 'pur' },
  proposal: { label: 'Proposal', tone: 'warn' },
  file: { label: 'File', tone: 'neu' },
  stage: { label: 'Stage change', tone: 'info' },
  contract: { label: 'Contract', tone: 'ok' },
  invoice: { label: 'Invoice', tone: 'info' },
  payment: { label: 'Payment', tone: 'ok' },
};

export const APPROVAL_STATUS: Record<ApprovalStatus, { label: string; tab: string; tone: Tone }> = {
  pending: { label: 'Pending', tab: 'Pending', tone: 'warn' },
  approved: { label: 'Approved', tab: 'Completed', tone: 'ok' },
  rejected: { label: 'Rejected', tab: 'Rejected', tone: 'bad' },
};

export const APPROVAL_KIND: Record<ApprovalKind, string> = {
  proposal: 'Proposal',
  discount: 'Discount',
  contract: 'Contract',
  invoice: 'Invoice',
  expense: 'Expense',
  other: 'Other',
};

/** Common lead sources (for a datalist). */
export const LEAD_SOURCES = [
  'Inbound', 'Referral', 'Outbound', 'Event / Conference', 'Partner', 'Website',
  'Cold Outreach', 'Existing Network', 'RFP / Tender', 'LinkedIn',
];

/** Plain integer with thousands separators (student/faculty strength etc.). */
export function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-IN').format(n);
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const day = 86400000;
  if (diff < 0) return fmtDate(iso);
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < day) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return fmtDate(iso.slice(0, 10));
}
