import 'server-only';
import { db } from './db';
import type {
  Account,
  Activity,
  ActivityKind,
  Approval,
  ApprovalStatus,
  Client,
  Contact,
  Contract,
  ContractItem,
  Invoice,
  InvoiceItem,
  SalesStage,
  Settings,
} from './types';
import { annualized } from './format';

// Values SQLite accepts as bound parameters.
type Bind = string | number | bigint | Uint8Array | null;

// node:sqlite returns null-prototype row objects; spread to plain objects.
const plain = <T>(row: unknown): T => ({ ...(row as object) }) as T;
const plainAll = <T>(rows: unknown[]): T[] => rows.map((r) => plain<T>(r));

// Reentrant: nested tx() calls join the outer transaction instead of issuing a
// second BEGIN (node:sqlite has one connection, so a depth flag is safe).
let inTx = false;
function tx<T>(fn: () => T): T {
  if (inTx) return fn();
  db.exec('BEGIN');
  inTx = true;
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  } finally {
    inTx = false;
  }
}

// ---------------------------------------------------------------- Settings
export function getSettings(): Settings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value ?? '';
  return out as unknown as Settings;
}

export function updateSettings(patch: Record<string, string>): void {
  const stmt = db.prepare(
    'INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  );
  tx(() => {
    for (const [k, v] of Object.entries(patch)) stmt.run(k, v ?? '');
  });
}

export function getAccounts(): Account[] {
  try {
    const arr = JSON.parse(getSettings().accounts || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- Clients
export interface ClientRow extends Client {
  contract_count: number;
  invoiced: number;
  collected: number;
  outstanding: number;
  last_activity_at: string | null;
}

export function listClients(opts: { status?: string; stage?: string; segment?: string; q?: string } = {}): ClientRow[] {
  const where: string[] = [];
  const args: Bind[] = [];
  if (opts.status && opts.status !== 'all') { where.push('c.status = ?'); args.push(opts.status); }
  if (opts.stage && opts.stage !== 'all') { where.push('c.sales_stage = ?'); args.push(opts.stage); }
  if (opts.segment && opts.segment !== 'all') { where.push('c.segment = ?'); args.push(opts.segment); }
  if (opts.q) {
    where.push('(c.name LIKE ? OR c.email LIKE ? OR c.gst_number LIKE ? OR c.source LIKE ?)');
    const like = `%${opts.q}%`;
    args.push(like, like, like, like);
  }
  const sql = `
    SELECT c.*,
      (SELECT COUNT(*) FROM contracts ct WHERE ct.client_id = c.id) AS contract_count,
      (SELECT COALESCE(SUM(i.total),0) FROM invoices i WHERE i.client_id = c.id) AS invoiced,
      (SELECT COALESCE(SUM(i.total),0) FROM invoices i WHERE i.client_id = c.id AND i.status='paid') AS collected,
      (SELECT MAX(a.occurred_at) FROM activities a WHERE a.client_id = c.id) AS last_activity_at
    FROM clients c
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY c.name COLLATE NOCASE ASC`;
  const rows = plainAll<ClientRow>(db.prepare(sql).all(...args));
  for (const r of rows) r.outstanding = (r.invoiced || 0) - (r.collected || 0);
  return rows;
}

export function clientStageCounts(): Record<string, number> {
  const rows = db.prepare('SELECT sales_stage, COUNT(*) AS n FROM clients GROUP BY sales_stage').all() as {
    sales_stage: string;
    n: number;
  }[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.sales_stage] = r.n;
  return out;
}

export function getClient(id: number): Client | null {
  const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  return row ? plain<Client>(row) : null;
}

// All writable client columns, in a single source of truth.
const CLIENT_COLS = [
  'name', 'status', 'sales_stage', 'email', 'phone', 'address', 'gst_number', 'currency', 'notes',
  'category', 'segment', 'website', 'total_campuses', 'locations', 'student_strength', 'faculty_strength',
  'nirf', 'nirf_category', 'nirf_rank', 'qs_ranking', 'qs_details',
  'source', 'projected_value', 'expected_close', 'engagement_started', 'issues',
] as const;

function clientValues(d: Partial<Client>): Bind[] {
  const v: Record<string, Bind> = {
    name: d.name ?? 'Untitled Client',
    status: d.status ?? 'prospective',
    sales_stage: d.sales_stage ?? 'untouched',
    email: d.email ?? null,
    phone: d.phone ?? null,
    address: d.address ?? null,
    gst_number: d.gst_number ?? null,
    currency: d.currency ?? 'INR',
    notes: d.notes ?? null,
    category: d.category ?? null,
    segment: d.segment ?? null,
    website: d.website ?? null,
    total_campuses: d.total_campuses ?? null,
    locations: d.locations ?? null,
    student_strength: d.student_strength ?? null,
    faculty_strength: d.faculty_strength ?? null,
    nirf: d.nirf ? 1 : 0,
    nirf_category: d.nirf_category ?? null,
    nirf_rank: d.nirf_rank ?? null,
    qs_ranking: d.qs_ranking ? 1 : 0,
    qs_details: d.qs_details ?? null,
    source: d.source ?? null,
    projected_value: d.projected_value ?? null,
    expected_close: d.expected_close ?? null,
    engagement_started: d.engagement_started ?? null,
    issues: d.issues ?? null,
  };
  return CLIENT_COLS.map((c) => v[c]);
}

export function createClient(d: Partial<Client>): number {
  const cols = CLIENT_COLS.join(', ');
  const ph = CLIENT_COLS.map(() => '?').join(', ');
  const r = db.prepare(`INSERT INTO clients(${cols}) VALUES(${ph})`).run(...clientValues(d));
  return Number(r.lastInsertRowid);
}

export function updateClient(id: number, d: Partial<Client>): void {
  const set = CLIENT_COLS.map((c) => `${c}=?`).join(', ');
  db.prepare(`UPDATE clients SET ${set}, updated_at=datetime('now') WHERE id=?`).run(...clientValues(d), id);
}

export function deleteClient(id: number): void {
  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
}

// ---------------------------------------------------------------- Contracts
export interface ContractRow extends Contract {
  client_name: string;
  client_status: string;
  invoice_count: number;
  invoiced: number;
  collected: number;
}

const CONTRACT_SELECT = `
  SELECT ct.*, c.name AS client_name, c.status AS client_status,
    (SELECT COUNT(*) FROM invoices i WHERE i.contract_id = ct.id) AS invoice_count,
    (SELECT COALESCE(SUM(i.total),0) FROM invoices i WHERE i.contract_id = ct.id) AS invoiced,
    (SELECT COALESCE(SUM(i.total),0) FROM invoices i WHERE i.contract_id = ct.id AND i.status='paid') AS collected
  FROM contracts ct JOIN clients c ON c.id = ct.client_id`;

export function listContracts(opts: { status?: string; q?: string } = {}): ContractRow[] {
  const where: string[] = [];
  const args: Bind[] = [];
  if (opts.status && opts.status !== 'all') {
    where.push('ct.status = ?');
    args.push(opts.status);
  }
  if (opts.q) {
    where.push('(ct.title LIKE ? OR c.name LIKE ? OR ct.party LIKE ?)');
    const like = `%${opts.q}%`;
    args.push(like, like, like);
  }
  const sql = `${CONTRACT_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ct.created_at DESC`;
  return plainAll<ContractRow>(db.prepare(sql).all(...args));
}

export function contractsByClient(clientId: number): ContractRow[] {
  return plainAll<ContractRow>(
    db.prepare(`${CONTRACT_SELECT} WHERE ct.client_id = ? ORDER BY ct.created_at DESC`).all(clientId),
  );
}

export function getContract(id: number): ContractRow | null {
  const row = db.prepare(`${CONTRACT_SELECT} WHERE ct.id = ?`).get(id);
  return row ? plain<ContractRow>(row) : null;
}

export function createContract(d: Partial<Contract>, items: { label: string; value: string }[] = []): number {
  return tx(() => {
    const r = db
      .prepare(
        `INSERT INTO contracts(client_id, title, party, pdf_file, pdf_name, start_date, end_date, billing_cycle, amount, currency, tax_rate, status, product, terms, notes)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        d.client_id!,
        d.title ?? 'Untitled Contract',
        d.party ?? null,
        d.pdf_file ?? null,
        d.pdf_name ?? null,
        d.start_date ?? null,
        d.end_date ?? null,
        d.billing_cycle ?? 'annual',
        d.amount ?? 0,
        d.currency ?? 'INR',
        d.tax_rate ?? 18,
        d.status ?? 'active',
        d.product ?? null,
        d.terms ?? null,
        d.notes ?? null,
      );
    const cid = Number(r.lastInsertRowid);
    replaceContractItems(cid, items);
    logActivity(d.client_id!, 'contract', `Contract added — ${d.title ?? 'Untitled Contract'}`, null,
      { contract_id: cid, amount: d.amount ?? 0, currency: d.currency ?? 'INR' });
    return cid;
  });
}

export function updateContract(id: number, d: Partial<Contract>, items?: { label: string; value: string }[]): void {
  tx(() => {
    db.prepare(
      `UPDATE contracts SET title=?, party=?, start_date=?, end_date=?, billing_cycle=?, amount=?, currency=?, tax_rate=?, status=?, product=?, terms=?, notes=?, updated_at=datetime('now')
       WHERE id=?`,
    ).run(
      d.title ?? '',
      d.party ?? null,
      d.start_date ?? null,
      d.end_date ?? null,
      d.billing_cycle ?? 'annual',
      d.amount ?? 0,
      d.currency ?? 'INR',
      d.tax_rate ?? 18,
      d.status ?? 'active',
      d.product ?? null,
      d.terms ?? null,
      d.notes ?? null,
      id,
    );
    if (items) replaceContractItems(id, items);
  });
}

export function setContractPdf(id: number, file: string | null, name: string | null): void {
  db.prepare('UPDATE contracts SET pdf_file=?, pdf_name=?, updated_at=datetime(\'now\') WHERE id=?').run(file, name, id);
}

export function deleteContract(id: number): void {
  db.prepare('DELETE FROM contracts WHERE id = ?').run(id);
}

export function itemsByContract(contractId: number): ContractItem[] {
  return plainAll<ContractItem>(
    db.prepare('SELECT * FROM contract_items WHERE contract_id = ? ORDER BY sort, id').all(contractId),
  );
}

export function replaceContractItems(contractId: number, items: { label: string; value: string }[]): void {
  db.prepare('DELETE FROM contract_items WHERE contract_id = ?').run(contractId);
  const stmt = db.prepare('INSERT INTO contract_items(contract_id, label, value, sort) VALUES(?,?,?,?)');
  items
    .filter((it) => (it.label || '').trim() || (it.value || '').trim())
    .forEach((it, i) => stmt.run(contractId, it.label || '', it.value || '', i));
}

// ---------------------------------------------------------------- Invoices
export interface InvoiceRow extends Invoice {
  client_name: string;
  contract_title: string;
}

const INVOICE_SELECT = `
  SELECT i.*, c.name AS client_name, ct.title AS contract_title
  FROM invoices i JOIN clients c ON c.id = i.client_id JOIN contracts ct ON ct.id = i.contract_id`;

export function listInvoices(opts: { status?: string; q?: string; year?: string } = {}): InvoiceRow[] {
  const where: string[] = [];
  const args: Bind[] = [];
  if (opts.status && opts.status !== 'all') {
    where.push('i.status = ?');
    args.push(opts.status);
  }
  if (opts.year && opts.year !== 'all') {
    where.push("strftime('%Y', i.issue_date) = ?");
    args.push(opts.year);
  }
  if (opts.q) {
    where.push('(i.invoice_number LIKE ? OR c.name LIKE ? OR ct.title LIKE ?)');
    const like = `%${opts.q}%`;
    args.push(like, like, like);
  }
  const sql = `${INVOICE_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY i.issue_date DESC, i.id DESC`;
  return plainAll<InvoiceRow>(db.prepare(sql).all(...args));
}

export function invoicesByContract(contractId: number): InvoiceRow[] {
  return plainAll<InvoiceRow>(
    db.prepare(`${INVOICE_SELECT} WHERE i.contract_id = ? ORDER BY i.issue_date DESC, i.id DESC`).all(contractId),
  );
}

export function invoicesByClient(clientId: number): InvoiceRow[] {
  return plainAll<InvoiceRow>(
    db.prepare(`${INVOICE_SELECT} WHERE i.client_id = ? ORDER BY i.issue_date DESC, i.id DESC`).all(clientId),
  );
}

export function getInvoice(id: number): InvoiceRow | null {
  const row = db.prepare(`${INVOICE_SELECT} WHERE i.id = ?`).get(id);
  return row ? plain<InvoiceRow>(row) : null;
}

export function itemsByInvoice(invoiceId: number): InvoiceItem[] {
  return plainAll<InvoiceItem>(
    db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort, id').all(invoiceId),
  );
}

export function invoiceYears(): string[] {
  const rows = db
    .prepare("SELECT DISTINCT strftime('%Y', issue_date) AS y FROM invoices ORDER BY y DESC")
    .all() as { y: string }[];
  return rows.map((r) => r.y).filter(Boolean);
}

/** Generate the next invoice number using the org prefix + year + running sequence. */
export function peekInvoiceNumber(issueDate: string): string {
  const s = getSettings();
  const seq = parseInt(s.invoice_next_seq || '1', 10) || 1;
  const year = (issueDate || '').slice(0, 4) || String(new Date().getFullYear());
  return `${s.invoice_prefix || 'INV'}-${year}-${String(seq).padStart(4, '0')}`;
}

interface InvoiceInput {
  contract_id: number;
  client_id: number;
  invoice_number: string;
  issue_date: string;
  due_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  bill_to_name?: string | null;
  client_address?: string | null;
  gst_number?: string | null;
  currency: string;
  tax_rate: number;
  template?: string;
  template_mode?: string;
  notes?: string | null;
}

function computeTotals(items: { qty: number; unit_price: number }[], taxRate: number) {
  const subtotal = items.reduce((s, it) => s + (it.qty || 0) * (it.unit_price || 0), 0);
  const tax_amount = +(subtotal * (taxRate || 0) / 100).toFixed(2);
  const total = +(subtotal + tax_amount).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), tax_amount, total };
}

export function createInvoice(
  d: InvoiceInput,
  items: { description: string; qty: number; unit_price: number }[],
  opts: { bumpSeq?: boolean } = {},
): number {
  const lineItems = items.filter((it) => (it.description || '').trim() || it.qty || it.unit_price);
  const { subtotal, tax_amount, total } = computeTotals(lineItems, d.tax_rate);
  return tx(() => {
    const r = db
      .prepare(
        `INSERT INTO invoices(contract_id, client_id, invoice_number, issue_date, due_date, period_start, period_end,
          bill_to_name, client_address, gst_number, currency, subtotal, tax_rate, tax_amount, total, template, template_mode, notes, status)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'unpaid')`,
      )
      .run(
        d.contract_id,
        d.client_id,
        d.invoice_number,
        d.issue_date,
        d.due_date ?? null,
        d.period_start ?? null,
        d.period_end ?? null,
        d.bill_to_name ?? null,
        d.client_address ?? null,
        d.gst_number ?? null,
        d.currency,
        subtotal,
        d.tax_rate,
        tax_amount,
        total,
        d.template ?? 'classic',
        d.template_mode ?? 'light',
        d.notes ?? null,
      );
    const id = Number(r.lastInsertRowid);
    const stmt = db.prepare(
      'INSERT INTO invoice_items(invoice_id, description, qty, unit_price, amount, sort) VALUES(?,?,?,?,?,?)',
    );
    lineItems.forEach((it, i) =>
      stmt.run(id, it.description || '', it.qty || 0, it.unit_price || 0, +((it.qty || 0) * (it.unit_price || 0)).toFixed(2), i),
    );
    logActivity(d.client_id, 'invoice', `Invoice ${d.invoice_number} generated`, null,
      { invoice_id: id, total, currency: d.currency });
    if (opts.bumpSeq) {
      const s = getSettings();
      const next = (parseInt(s.invoice_next_seq || '1', 10) || 1) + 1;
      updateSettings({ invoice_next_seq: String(next) });
    }
    return id;
  });
}

export function updateInvoice(
  id: number,
  d: Partial<InvoiceInput>,
  items: { description: string; qty: number; unit_price: number }[],
): void {
  const lineItems = items.filter((it) => (it.description || '').trim() || it.qty || it.unit_price);
  const { subtotal, tax_amount, total } = computeTotals(lineItems, d.tax_rate ?? 0);
  tx(() => {
    db.prepare(
      `UPDATE invoices SET invoice_number=?, issue_date=?, due_date=?, period_start=?, period_end=?,
        bill_to_name=?, client_address=?, gst_number=?, currency=?, subtotal=?, tax_rate=?, tax_amount=?, total=?, template=?, template_mode=?, notes=?, updated_at=datetime('now')
       WHERE id=?`,
    ).run(
      d.invoice_number ?? '',
      d.issue_date ?? '',
      d.due_date ?? null,
      d.period_start ?? null,
      d.period_end ?? null,
      d.bill_to_name ?? null,
      d.client_address ?? null,
      d.gst_number ?? null,
      d.currency ?? 'INR',
      subtotal,
      d.tax_rate ?? 0,
      tax_amount,
      total,
      d.template ?? 'classic',
      d.template_mode ?? 'light',
      d.notes ?? null,
      id,
    );
    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);
    const stmt = db.prepare(
      'INSERT INTO invoice_items(invoice_id, description, qty, unit_price, amount, sort) VALUES(?,?,?,?,?,?)',
    );
    lineItems.forEach((it, i) =>
      stmt.run(id, it.description || '', it.qty || 0, it.unit_price || 0, +((it.qty || 0) * (it.unit_price || 0)).toFixed(2), i),
    );
  });
}

export function markPaid(
  id: number,
  d: { paid_at: string; payment_method: string; payment_account: string; transaction_ref: string; payment_proof?: string | null },
): void {
  db.prepare(
    `UPDATE invoices SET status='paid', paid_at=?, payment_method=?, payment_account=?, transaction_ref=?, payment_proof=COALESCE(?, payment_proof), updated_at=datetime('now')
     WHERE id=?`,
  ).run(d.paid_at, d.payment_method, d.payment_account, d.transaction_ref, d.payment_proof ?? null, id);
  const iv = db.prepare('SELECT client_id, invoice_number, total, currency FROM invoices WHERE id=?').get(id) as
    | { client_id: number; invoice_number: string; total: number; currency: string } | undefined;
  if (iv) logActivity(iv.client_id, 'payment', `Payment recorded — ${iv.invoice_number}`, null,
    { invoice_id: id, total: iv.total, currency: iv.currency });
}

export function markUnpaid(id: number): void {
  db.prepare(
    `UPDATE invoices SET status='unpaid', paid_at=NULL, payment_method=NULL, payment_account=NULL, transaction_ref=NULL, payment_proof=NULL, updated_at=datetime('now')
     WHERE id=?`,
  ).run(id);
}

export function deleteInvoice(id: number): void {
  db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
}

// ---------------------------------------------------------------- Reporting
export interface Totals {
  invoiced: number;
  collected: number;
  outstanding: number;
  count: number;
  paidCount: number;
  overdue: number;
  overdueCount: number;
}

export function totals(year?: string): Totals {
  const yearFilter = year && year !== 'all' ? "WHERE strftime('%Y', issue_date) = ?" : '';
  const args = year && year !== 'all' ? [year] : [];
  const r = db
    .prepare(
      `SELECT
        COALESCE(SUM(total),0) AS invoiced,
        COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0) AS collected,
        COUNT(*) AS count,
        COALESCE(SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END),0) AS paidCount,
        COALESCE(SUM(CASE WHEN status!='paid' AND due_date IS NOT NULL AND due_date < date('now') THEN total ELSE 0 END),0) AS overdue,
        COALESCE(SUM(CASE WHEN status!='paid' AND due_date IS NOT NULL AND due_date < date('now') THEN 1 ELSE 0 END),0) AS overdueCount
       FROM invoices ${yearFilter}`,
    )
    .get(...args) as unknown as Totals;
  const out = plain<Totals>(r);
  out.outstanding = (out.invoiced || 0) - (out.collected || 0);
  return out;
}

export interface PeriodRevenue {
  period: string;
  invoiced: number;
  collected: number;
  count: number;
}

export function revenueByYear(): PeriodRevenue[] {
  return plainAll<PeriodRevenue>(
    db
      .prepare(
        `SELECT strftime('%Y', issue_date) AS period,
          COALESCE(SUM(total),0) AS invoiced,
          COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0) AS collected,
          COUNT(*) AS count
        FROM invoices GROUP BY period ORDER BY period ASC`,
      )
      .all(),
  );
}

export function revenueByMonth(year: string): PeriodRevenue[] {
  const rows = plainAll<PeriodRevenue>(
    db
      .prepare(
        `SELECT strftime('%m', issue_date) AS period,
          COALESCE(SUM(total),0) AS invoiced,
          COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0) AS collected,
          COUNT(*) AS count
        FROM invoices WHERE strftime('%Y', issue_date) = ? GROUP BY period ORDER BY period ASC`,
      )
      .all(year),
  );
  // Fill all 12 months for a stable chart.
  const map = new Map(rows.map((r) => [r.period, r]));
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  return months.map((m) => map.get(m) ?? { period: m, invoiced: 0, collected: 0, count: 0 });
}

export function revenueByWeek(weeks = 12): PeriodRevenue[] {
  return plainAll<PeriodRevenue>(
    db
      .prepare(
        `SELECT strftime('%Y-W%W', issue_date) AS period,
          COALESCE(SUM(total),0) AS invoiced,
          COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0) AS collected,
          COUNT(*) AS count
        FROM invoices
        WHERE issue_date >= date('now', ?)
        GROUP BY period ORDER BY period ASC`,
      )
      .all(`-${weeks * 7} days`),
  );
}

export interface ClientRevenue {
  id: number;
  name: string;
  status: string;
  invoiced: number;
  collected: number;
  outstanding: number;
}

export function revenueByClient(year?: string): ClientRevenue[] {
  const yearFilter = year && year !== 'all' ? "AND strftime('%Y', i.issue_date) = ?" : '';
  const args = year && year !== 'all' ? [year] : [];
  const rows = plainAll<ClientRevenue>(
    db
      .prepare(
        `SELECT c.id, c.name, c.status,
          COALESCE(SUM(i.total),0) AS invoiced,
          COALESCE(SUM(CASE WHEN i.status='paid' THEN i.total ELSE 0 END),0) AS collected
        FROM clients c JOIN invoices i ON i.client_id = c.id
        WHERE 1=1 ${yearFilter}
        GROUP BY c.id ORDER BY invoiced DESC`,
      )
      .all(...args),
  );
  for (const r of rows) r.outstanding = (r.invoiced || 0) - (r.collected || 0);
  return rows;
}

/** Annual recurring revenue from active recurring contracts (excludes one-time). */
export function recurringRevenue(): { arr: number; byCycle: Record<string, number> } {
  const rows = db
    .prepare("SELECT billing_cycle, amount FROM contracts WHERE status='active'")
    .all() as { billing_cycle: string; amount: number }[];
  let arr = 0;
  const byCycle: Record<string, number> = { annual: 0, monthly: 0, weekly: 0, one_time: 0 };
  for (const r of rows) {
    const a = annualized(r.amount || 0, r.billing_cycle as never);
    arr += a;
    byCycle[r.billing_cycle] = (byCycle[r.billing_cycle] || 0) + (r.amount || 0);
  }
  return { arr, byCycle };
}

export interface Counts {
  clients: number;
  activeClients: number;
  contracts: number;
  activeContracts: number;
  invoices: number;
}

export function counts(): Counts {
  const g = (sql: string) => (db.prepare(sql).get() as unknown as { n: number }).n;
  return {
    clients: g('SELECT COUNT(*) AS n FROM clients'),
    activeClients: g("SELECT COUNT(*) AS n FROM clients WHERE status='active'"),
    contracts: g('SELECT COUNT(*) AS n FROM contracts'),
    activeContracts: g("SELECT COUNT(*) AS n FROM contracts WHERE status='active'"),
    invoices: g('SELECT COUNT(*) AS n FROM invoices'),
  };
}

export function clientStatusCounts(): Record<string, number> {
  const rows = db.prepare('SELECT status, COUNT(*) AS n FROM clients GROUP BY status').all() as {
    status: string;
    n: number;
  }[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = r.n;
  return out;
}

export function recentInvoices(limit = 8): InvoiceRow[] {
  return plainAll<InvoiceRow>(db.prepare(`${INVOICE_SELECT} ORDER BY i.created_at DESC LIMIT ?`).all(limit));
}

/** Contracts whose validity ends within `days`. */
export function expiringContracts(days = 60): ContractRow[] {
  return plainAll<ContractRow>(
    db
      .prepare(
        `${CONTRACT_SELECT} WHERE ct.status='active' AND ct.end_date IS NOT NULL
         AND ct.end_date >= date('now') AND ct.end_date <= date('now', ?)
         ORDER BY ct.end_date ASC`,
      )
      .all(`+${days} days`),
  );
}

// ---------------------------------------------------------------- Analytics v2
export interface MonthPoint {
  month: string; // YYYY-MM
  invoiced: number;
  collected: number;
  count: number;
}

/** Last `n` calendar months (inclusive of current), zero-filled. */
export function monthlySeries(n = 12): MonthPoint[] {
  const rows = plainAll<MonthPoint & { month: string }>(
    db
      .prepare(
        `SELECT strftime('%Y-%m', issue_date) AS month,
          COALESCE(SUM(total),0) AS invoiced,
          COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0) AS collected,
          COUNT(*) AS count
        FROM invoices
        WHERE issue_date >= date('now','start of month', ?)
        GROUP BY month`,
      )
      .all(`-${n - 1} months`),
  );
  const map = new Map(rows.map((r) => [r.month, r]));
  const out: MonthPoint[] = [];
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - (n - 1));
  for (let i = 0; i < n; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push(map.get(key) ?? { month: key, invoiced: 0, collected: 0, count: 0 });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

export interface CategoryRevenue {
  category: string; // product category key, or 'untagged'
  invoiced: number;
  collected: number;
  contracts: number;
}

/** Revenue rolled up by the contract's product category. */
export function revenueByCategory(year?: string): CategoryRevenue[] {
  const yearFilter = year && year !== 'all' ? "AND strftime('%Y', i.issue_date) = ?" : '';
  const args = year && year !== 'all' ? [year] : [];
  const rows = db
    .prepare(
      `SELECT ct.product AS product,
        COALESCE(SUM(i.total),0) AS invoiced,
        COALESCE(SUM(CASE WHEN i.status='paid' THEN i.total ELSE 0 END),0) AS collected
      FROM invoices i JOIN contracts ct ON ct.id = i.contract_id
      WHERE 1=1 ${yearFilter}
      GROUP BY ct.product`,
    )
    .all(...args) as { product: string | null; invoiced: number; collected: number }[];
  const contractCounts = db
    .prepare(`SELECT product, COUNT(*) AS n FROM contracts GROUP BY product`)
    .all() as { product: string | null; n: number }[];

  const catOf = (p: string | null) => (p ? p.split('-')[0] : 'untagged');
  const agg = new Map<string, CategoryRevenue>();
  for (const r of rows) {
    const key = catOf(r.product);
    const cur = agg.get(key) ?? { category: key, invoiced: 0, collected: 0, contracts: 0 };
    cur.invoiced += r.invoiced;
    cur.collected += r.collected;
    agg.set(key, cur);
  }
  for (const c of contractCounts) {
    const key = catOf(c.product);
    const cur = agg.get(key) ?? { category: key, invoiced: 0, collected: 0, contracts: 0 };
    cur.contracts += c.n;
    agg.set(key, cur);
  }
  return [...agg.values()].sort((a, b) => b.invoiced - a.invoiced);
}

export interface ProductRevenue {
  product: string | null;
  invoiced: number;
  collected: number;
  invoices: number;
}

export function revenueByProduct(year?: string): ProductRevenue[] {
  const yearFilter = year && year !== 'all' ? "AND strftime('%Y', i.issue_date) = ?" : '';
  const args = year && year !== 'all' ? [year] : [];
  return plainAll<ProductRevenue>(
    db
      .prepare(
        `SELECT ct.product AS product,
          COALESCE(SUM(i.total),0) AS invoiced,
          COALESCE(SUM(CASE WHEN i.status='paid' THEN i.total ELSE 0 END),0) AS collected,
          COUNT(*) AS invoices
        FROM invoices i JOIN contracts ct ON ct.id = i.contract_id
        WHERE 1=1 ${yearFilter}
        GROUP BY ct.product ORDER BY invoiced DESC`,
      )
      .all(...args),
  );
}

export interface MonthDelta {
  current: number;
  previous: number;
  /** % change vs previous month, null when previous month has no data. */
  pct: number | null;
}

function delta(current: number, previous: number): MonthDelta {
  return { current, previous, pct: previous > 0 ? ((current - previous) / previous) * 100 : null };
}

/** Real month-over-month movement for the KPI tiles (no invented numbers). */
export function monthDeltas(): { collected: MonthDelta; invoiced: MonthDelta; invoices: MonthDelta } {
  const g = (expr: string, offset: string) =>
    (db
      .prepare(
        `SELECT COALESCE(${expr},0) AS v FROM invoices
         WHERE strftime('%Y-%m', issue_date) = strftime('%Y-%m', date('now', ?))`,
      )
      .get(offset) as unknown as { v: number }).v;
  return {
    collected: delta(g("SUM(CASE WHEN status='paid' THEN total ELSE 0 END)", '+0 months'), g("SUM(CASE WHEN status='paid' THEN total ELSE 0 END)", '-1 months')),
    invoiced: delta(g('SUM(total)', '+0 months'), g('SUM(total)', '-1 months')),
    invoices: delta(g('COUNT(*)', '+0 months'), g('COUNT(*)', '-1 months')),
  };
}

// ================================================================ Contacts
export function contactsByClient(clientId: number): Contact[] {
  return plainAll<Contact>(
    db.prepare('SELECT * FROM contacts WHERE client_id = ? ORDER BY sort, id').all(clientId),
  );
}

export function replaceContacts(clientId: number, rows: Partial<Contact>[]): void {
  tx(() => {
    db.prepare('DELETE FROM contacts WHERE client_id = ?').run(clientId);
    const stmt = db.prepare(
      'INSERT INTO contacts(client_id, role, name, email, phone, location, linkedin, sort) VALUES(?,?,?,?,?,?,?,?)',
    );
    rows
      .filter((r) => (r.name || r.email || r.phone || r.linkedin || '').trim())
      .forEach((r, i) => stmt.run(clientId, r.role ?? 'poc', r.name ?? null, r.email ?? null, r.phone ?? null, r.location ?? null, r.linkedin ?? null, i));
  });
}

// ============================================================== Activities
export function logActivity(
  clientId: number,
  kind: ActivityKind,
  title: string,
  body: string | null = null,
  meta: Record<string, unknown> | null = null,
  occurredAt?: string,
  file?: { file: string; name: string } | null,
): number {
  const r = db
    .prepare(
      `INSERT INTO activities(client_id, kind, title, body, occurred_at, file, file_name, meta)
       VALUES(?,?,?,?,COALESCE(?, datetime('now')),?,?,?)`,
    )
    .run(clientId, kind, title, body, occurredAt ?? null, file?.file ?? null, file?.name ?? null, meta ? JSON.stringify(meta) : null);
  return Number(r.lastInsertRowid);
}

export function activitiesByClient(clientId: number): Activity[] {
  return plainAll<Activity>(
    db.prepare('SELECT * FROM activities WHERE client_id = ? ORDER BY occurred_at DESC, id DESC').all(clientId),
  );
}

export function deleteActivity(id: number): void {
  db.prepare('DELETE FROM activities WHERE id = ?').run(id);
}

export interface ActivityRow extends Activity {
  client_name: string;
}

export function recentActivities(limit = 12): ActivityRow[] {
  return plainAll<ActivityRow>(
    db
      .prepare(
        `SELECT a.*, c.name AS client_name FROM activities a JOIN clients c ON c.id = a.client_id
         ORDER BY a.occurred_at DESC, a.id DESC LIMIT ?`,
      )
      .all(limit),
  );
}

// =============================================================== Approvals
export interface ApprovalRow extends Approval {
  client_name: string | null;
}

const APPROVAL_SELECT = `SELECT a.*, c.name AS client_name FROM approvals a LEFT JOIN clients c ON c.id = a.client_id`;

export function listApprovals(status?: string): ApprovalRow[] {
  const where = status && status !== 'all' ? 'WHERE a.status = ?' : '';
  const args = status && status !== 'all' ? [status] : [];
  return plainAll<ApprovalRow>(
    db.prepare(`${APPROVAL_SELECT} ${where} ORDER BY (a.status='pending') DESC, a.created_at DESC`).all(...args),
  );
}

export function getApproval(id: number): ApprovalRow | null {
  const row = db.prepare(`${APPROVAL_SELECT} WHERE a.id = ?`).get(id);
  return row ? plain<ApprovalRow>(row) : null;
}

export function approvalCounts(): Record<ApprovalStatus, number> {
  const rows = db.prepare('SELECT status, COUNT(*) AS n FROM approvals GROUP BY status').all() as {
    status: ApprovalStatus;
    n: number;
  }[];
  const out = { pending: 0, approved: 0, rejected: 0 } as Record<ApprovalStatus, number>;
  for (const r of rows) out[r.status] = r.n;
  return out;
}

export function createApproval(d: Partial<Approval>): number {
  const r = db
    .prepare(
      `INSERT INTO approvals(title, detail, kind, client_id, contract_id, invoice_id, amount, currency, requested_by, status)
       VALUES(?,?,?,?,?,?,?,?,?, 'pending')`,
    )
    .run(
      d.title ?? 'Approval', d.detail ?? null, d.kind ?? 'other',
      d.client_id ?? null, d.contract_id ?? null, d.invoice_id ?? null,
      d.amount ?? null, d.currency ?? null, d.requested_by ?? 'You',
    );
  return Number(r.lastInsertRowid);
}

export function decideApproval(id: number, status: ApprovalStatus, note: string, by = 'You'): void {
  db.prepare(
    `UPDATE approvals SET status=?, decision_note=?, decided_by=?, decided_at=datetime('now') WHERE id=?`,
  ).run(status, note || null, by, id);
}

export function deleteApproval(id: number): void {
  db.prepare('DELETE FROM approvals WHERE id = ?').run(id);
}

// =============================================================== Pipeline
export interface PipelineClient {
  id: number;
  name: string;
  sales_stage: SalesStage;
  segment: string | null;
  source: string | null;
  projected_value: number | null;
  currency: string;
  expected_close: string | null;
  last_activity_at: string | null;
  outstanding: number;
}

export function pipelineClients(): PipelineClient[] {
  return plainAll<PipelineClient>(
    db
      .prepare(
        `SELECT c.id, c.name, c.sales_stage, c.segment, c.source, c.projected_value, c.currency, c.expected_close,
          (SELECT MAX(a.occurred_at) FROM activities a WHERE a.client_id = c.id) AS last_activity_at,
          (SELECT COALESCE(SUM(i.total),0) - COALESCE(SUM(CASE WHEN i.status='paid' THEN i.total ELSE 0 END),0)
             FROM invoices i WHERE i.client_id = c.id) AS outstanding
        FROM clients c ORDER BY c.projected_value DESC NULLS LAST, c.name COLLATE NOCASE ASC`,
      )
      .all(),
  );
}

export interface StageAgg {
  stage: SalesStage;
  count: number;
  projected: number;
}

export function pipelineFunnel(): StageAgg[] {
  return plainAll<StageAgg>(
    db.prepare('SELECT sales_stage AS stage, COUNT(*) AS count, COALESCE(SUM(projected_value),0) AS projected FROM clients GROUP BY sales_stage').all(),
  );
}

export function setSalesStage(clientId: number, stage: SalesStage): void {
  const cur = db.prepare('SELECT sales_stage, name FROM clients WHERE id=?').get(clientId) as
    | { sales_stage: SalesStage; name: string } | undefined;
  if (!cur || cur.sales_stage === stage) {
    if (cur) db.prepare("UPDATE clients SET sales_stage=?, updated_at=datetime('now') WHERE id=?").run(stage, clientId);
    return;
  }
  tx(() => {
    db.prepare("UPDATE clients SET sales_stage=?, updated_at=datetime('now') WHERE id=?").run(stage, clientId);
    logActivity(clientId, 'stage', 'Stage moved', null, { from: cur.sales_stage, to: stage });
  });
}

/** Clients that need attention: expected-close within `days`, or open & stale. */
export interface FollowUp {
  id: number;
  name: string;
  sales_stage: SalesStage;
  expected_close: string | null;
  last_activity_at: string | null;
  reason: string;
}

export function followUps(limit = 8): FollowUp[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.sales_stage, c.expected_close,
        (SELECT MAX(a.occurred_at) FROM activities a WHERE a.client_id = c.id) AS last_activity_at
      FROM clients c
      WHERE c.sales_stage IN ('communication_started','active_communication','physical_meetings','sales_cycle')`,
    )
    .all() as Omit<FollowUp, 'reason'>[];
  const now = Date.now();
  const scored = rows.map((r) => {
    const closeIn = r.expected_close ? Math.round((new Date(r.expected_close + 'T00:00:00').getTime() - now) / 86400000) : null;
    const staleDays = r.last_activity_at ? Math.floor((now - new Date(r.last_activity_at.replace(' ', 'T') + 'Z').getTime()) / 86400000) : 999;
    let reason = '';
    let priority = 0;
    if (closeIn !== null && closeIn <= 14) { reason = closeIn < 0 ? `Close date passed ${-closeIn}d ago` : `Expected close in ${closeIn}d`; priority = 100 - closeIn; }
    else if (staleDays >= 14) { reason = `No activity for ${staleDays === 999 ? 'a while' : staleDays + 'd'}`; priority = staleDays; }
    return { ...r, reason, priority };
  }).filter((r) => r.reason);
  scored.sort((a, b) => b.priority - a.priority);
  return scored.slice(0, limit).map(({ priority, ...r }) => { void priority; return r; });
}
