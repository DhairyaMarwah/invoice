import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Local data lives beside the app: SQLite file + uploaded contract PDFs.
export const DATA_DIR = path.join(process.cwd(), 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'app.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS clients (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'prospective',
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  gst_number    TEXT,
  currency      TEXT NOT NULL DEFAULT 'INR',
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contracts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  party         TEXT,
  pdf_file      TEXT,
  pdf_name      TEXT,
  start_date    TEXT,
  end_date      TEXT,
  billing_cycle TEXT NOT NULL DEFAULT 'annual',
  amount        REAL NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'INR',
  tax_rate      REAL NOT NULL DEFAULT 18,
  status        TEXT NOT NULL DEFAULT 'active',
  terms         TEXT,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contract_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id   INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  value         TEXT,
  sort          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invoices (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id    INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  client_id      INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  issue_date     TEXT NOT NULL,
  due_date       TEXT,
  period_start   TEXT,
  period_end     TEXT,
  bill_to_name   TEXT,
  client_address TEXT,
  gst_number     TEXT,
  currency       TEXT NOT NULL DEFAULT 'INR',
  subtotal       REAL NOT NULL DEFAULT 0,
  tax_rate       REAL NOT NULL DEFAULT 0,
  tax_amount     REAL NOT NULL DEFAULT 0,
  total          REAL NOT NULL DEFAULT 0,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'unpaid',
  paid_at        TEXT,
  payment_method TEXT,
  payment_account TEXT,
  transaction_ref TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id   INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  qty          REAL NOT NULL DEFAULT 1,
  unit_price   REAL NOT NULL DEFAULT 0,
  amount       REAL NOT NULL DEFAULT 0,
  sort         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- CRM: contacts attached to a client (POC / Promoter / Accounts / other)
CREATE TABLE IF NOT EXISTS contacts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'poc',
  name        TEXT,
  email       TEXT,
  phone       TEXT,
  location    TEXT,
  linkedin    TEXT,
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CRM: engagement / communications timeline
CREATE TABLE IF NOT EXISTS activities (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'note',
  title       TEXT,
  body        TEXT,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
  file        TEXT,
  file_name   TEXT,
  meta        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Approvals raised for sign-off (proposals, discounts, invoices, …)
CREATE TABLE IF NOT EXISTS approvals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  detail        TEXT,
  kind          TEXT NOT NULL DEFAULT 'other',
  client_id     INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  contract_id   INTEGER,
  invoice_id    INTEGER,
  amount        REAL,
  currency      TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  requested_by  TEXT,
  decided_by    TEXT,
  decided_at    TEXT,
  decision_note TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
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

const DEFAULT_SETTINGS: Record<string, string> = {
  org_name: 'Whitebird',
  org_tagline: 'AI Product Development',
  org_address: '',
  org_gstin: '',
  org_email: '',
  org_phone: '',
  default_currency: 'INR',
  default_tax_rate: '18',
  invoice_prefix: 'WB',
  invoice_next_seq: '1',
  invoice_due_days: '15',
  // Uploaded logo filename (in uploads dir), shown on invoices
  org_logo: '',
  // JSON array of { label, details } bank/payout accounts
  accounts: JSON.stringify([]),
};

/** Additive migrations for existing databases. */
function ensureColumn(db: DatabaseSync, table: string, col: string, ddl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

function init(): DatabaseSync {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);

  ensureColumn(db, 'contracts', 'product', 'product TEXT');
  ensureColumn(db, 'invoices', 'template', "template TEXT NOT NULL DEFAULT 'classic'");
  ensureColumn(db, 'invoices', 'payment_proof', 'payment_proof TEXT');
  ensureColumn(db, 'invoices', 'template_mode', "template_mode TEXT NOT NULL DEFAULT 'light'");

  // CRM / sales fields on clients
  ensureColumn(db, 'clients', 'sales_stage', "sales_stage TEXT NOT NULL DEFAULT 'untouched'");
  ensureColumn(db, 'clients', 'category', 'category TEXT');          // government | private
  ensureColumn(db, 'clients', 'segment', 'segment TEXT');            // university | college | edtech | k12
  ensureColumn(db, 'clients', 'website', 'website TEXT');
  ensureColumn(db, 'clients', 'total_campuses', 'total_campuses INTEGER');
  ensureColumn(db, 'clients', 'locations', 'locations TEXT');
  ensureColumn(db, 'clients', 'student_strength', 'student_strength INTEGER');
  ensureColumn(db, 'clients', 'faculty_strength', 'faculty_strength INTEGER');
  ensureColumn(db, 'clients', 'nirf', 'nirf INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'clients', 'nirf_category', 'nirf_category TEXT');
  ensureColumn(db, 'clients', 'nirf_rank', 'nirf_rank INTEGER');
  ensureColumn(db, 'clients', 'qs_ranking', 'qs_ranking INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'clients', 'qs_details', 'qs_details TEXT');
  ensureColumn(db, 'clients', 'source', 'source TEXT');
  ensureColumn(db, 'clients', 'projected_value', 'projected_value REAL');
  ensureColumn(db, 'clients', 'expected_close', 'expected_close TEXT');
  ensureColumn(db, 'clients', 'engagement_started', 'engagement_started TEXT');
  ensureColumn(db, 'clients', 'issues', 'issues TEXT');

  const upsert = db.prepare('INSERT OR IGNORE INTO settings(key, value) VALUES(?, ?)');
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) upsert.run(k, v);

  return db;
}

// Cache the connection across dev hot-reloads so we don't reopen the file each time.
const g = globalThis as unknown as { __ledgerDb?: DatabaseSync };
export const db: DatabaseSync = g.__ledgerDb ?? (g.__ledgerDb = init());
