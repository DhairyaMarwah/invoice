import 'server-only';
import { createClient, type Client, type InValue, type Transaction } from '@libsql/client';

// DB target: local file for dev, Turso (libsql://…) in production.
//   LIBSQL_URL=libsql://<db>.turso.io   LIBSQL_AUTH_TOKEN=<token>
const url = process.env.LIBSQL_URL || process.env.TURSO_DATABASE_URL || 'file:./data/app.db';
const authToken = process.env.LIBSQL_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

const g = globalThis as unknown as { __libsql?: Client };
export const client: Client = g.__libsql ?? (g.__libsql = createClient({ url, authToken }));

// Transactions are request-scoped via AsyncLocalStorage so concurrent requests
// on the same serverless instance never share a transaction handle.
import { AsyncLocalStorage } from 'node:async_hooks';
const txStore = new AsyncLocalStorage<Transaction>();
const executor = () => txStore.getStore() ?? client;

// --------------------------------------------------------------- schema
const SCHEMA = `
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'prospective',
  email TEXT, phone TEXT, address TEXT, gst_number TEXT, currency TEXT NOT NULL DEFAULT 'INR', notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL, party TEXT, pdf_file TEXT, pdf_name TEXT, start_date TEXT, end_date TEXT,
  billing_cycle TEXT NOT NULL DEFAULT 'annual', amount REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'INR',
  tax_rate REAL NOT NULL DEFAULT 18, status TEXT NOT NULL DEFAULT 'active', terms TEXT, notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS contract_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  label TEXT NOT NULL, value TEXT, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE, invoice_number TEXT NOT NULL,
  issue_date TEXT NOT NULL, due_date TEXT, period_start TEXT, period_end TEXT, bill_to_name TEXT, client_address TEXT,
  gst_number TEXT, currency TEXT NOT NULL DEFAULT 'INR', subtotal REAL NOT NULL DEFAULT 0, tax_rate REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, notes TEXT, status TEXT NOT NULL DEFAULT 'unpaid',
  paid_at TEXT, payment_method TEXT, payment_account TEXT, transaction_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL, qty REAL NOT NULL DEFAULT 1, unit_price REAL NOT NULL DEFAULT 0, amount REAL NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'poc', name TEXT, email TEXT, phone TEXT, location TEXT, linkedin TEXT,
  sort INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'note', title TEXT, body TEXT, occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
  file TEXT, file_name TEXT, meta TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, detail TEXT, kind TEXT NOT NULL DEFAULT 'other',
  client_id INTEGER, contract_id INTEGER, invoice_id INTEGER, amount REAL, currency TEXT, status TEXT NOT NULL DEFAULT 'pending',
  requested_by TEXT, decided_by TEXT, decided_at TEXT, decision_note TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract ON invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issue ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_items_contract ON contract_items(contract_id);
CREATE INDEX IF NOT EXISTS idx_invitems_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_contacts_client ON contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_client ON activities(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_when ON activities(occurred_at);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
`;

const CLIENT_MIGRATIONS: [string, string][] = [
  ['sales_stage', "sales_stage TEXT NOT NULL DEFAULT 'untouched'"], ['category', 'category TEXT'], ['segment', 'segment TEXT'],
  ['website', 'website TEXT'], ['total_campuses', 'total_campuses INTEGER'], ['locations', 'locations TEXT'],
  ['student_strength', 'student_strength INTEGER'], ['faculty_strength', 'faculty_strength INTEGER'],
  ['nirf', 'nirf INTEGER NOT NULL DEFAULT 0'], ['nirf_category', 'nirf_category TEXT'], ['nirf_rank', 'nirf_rank INTEGER'],
  ['qs_ranking', 'qs_ranking INTEGER NOT NULL DEFAULT 0'], ['qs_details', 'qs_details TEXT'], ['source', 'source TEXT'],
  ['projected_value', 'projected_value REAL'], ['expected_close', 'expected_close TEXT'], ['engagement_started', 'engagement_started TEXT'], ['issues', 'issues TEXT'],
];

const DEFAULT_SETTINGS: Record<string, string> = {
  org_name: 'Whitebird', org_tagline: 'AI Product Development', org_address: '', org_gstin: '', org_email: '', org_phone: '',
  default_currency: 'INR', default_tax_rate: '18', invoice_prefix: 'WB', invoice_next_seq: '1', invoice_due_days: '15',
  org_logo: '', accounts: JSON.stringify([]),
};

async function ensureColumn(table: string, col: string, ddl: string) {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  if (!info.rows.some((r) => (r as Record<string, unknown>).name === col)) {
    try { await client.execute(`ALTER TABLE ${table} ADD COLUMN ${ddl}`); } catch { /* raced / exists */ }
  }
}

let ready: Promise<void> | null = null;
export function ensureSchema(): Promise<void> {
  return (ready ??= (async () => {
    await client.executeMultiple(SCHEMA);
    await ensureColumn('contracts', 'product', 'product TEXT');
    await ensureColumn('invoices', 'template', "template TEXT NOT NULL DEFAULT 'classic'");
    await ensureColumn('invoices', 'payment_proof', 'payment_proof TEXT');
    await ensureColumn('invoices', 'template_mode', "template_mode TEXT NOT NULL DEFAULT 'light'");
    for (const [c, ddl] of CLIENT_MIGRATIONS) await ensureColumn('clients', c, ddl);
    await client.batch(
      Object.entries(DEFAULT_SETTINGS).map(([k, v]) => ({ sql: 'INSERT OR IGNORE INTO settings(key, value) VALUES(?, ?)', args: [k, v] })),
      'write',
    );
  })());
}

// --------------------------------------------------------------- query API
type Arg = InValue;
export interface RunResult { lastInsertRowid: number; changes: number }

export const db = {
  prepare(sql: string) {
    return {
      async run(...args: Arg[]): Promise<RunResult> {
        await ensureSchema();
        const r = await executor().execute({ sql, args });
        return { lastInsertRowid: Number(r.lastInsertRowid ?? 0), changes: Number(r.rowsAffected ?? 0) };
      },
      async get<T = Record<string, unknown>>(...args: Arg[]): Promise<T | undefined> {
        await ensureSchema();
        const r = await executor().execute({ sql, args });
        return r.rows[0] as T | undefined;
      },
      async all<T = Record<string, unknown>>(...args: Arg[]): Promise<T[]> {
        await ensureSchema();
        const r = await executor().execute({ sql, args });
        return r.rows as unknown as T[];
      },
    };
  },
  async exec(sql: string): Promise<void> {
    await ensureSchema();
    await executor().executeMultiple(sql);
  },
};

/** Reentrant, request-scoped write transaction. */
export async function tx<T>(fn: () => Promise<T>): Promise<T> {
  if (txStore.getStore()) return fn();
  await ensureSchema();
  const t = await client.transaction('write');
  try {
    const out = await txStore.run(t, fn);
    await t.commit();
    return out;
  } catch (e) {
    try { await t.rollback(); } catch { /* ignore */ }
    throw e;
  }
}
