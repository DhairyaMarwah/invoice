// Push the schema to the configured libSQL/Turso database (idempotent).
// Usage: node --env-file=.env.local scripts/migrate.mjs
import { createClient } from '@libsql/client';

const url = process.env.LIBSQL_URL || process.env.TURSO_DATABASE_URL || 'file:./data/app.db';
const authToken = process.env.LIBSQL_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

const SCHEMA = `
CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'prospective', email TEXT, phone TEXT, address TEXT, gst_number TEXT, currency TEXT NOT NULL DEFAULT 'INR', notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS contracts (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE, title TEXT NOT NULL, party TEXT, pdf_file TEXT, pdf_name TEXT, start_date TEXT, end_date TEXT, billing_cycle TEXT NOT NULL DEFAULT 'annual', amount REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'INR', tax_rate REAL NOT NULL DEFAULT 18, status TEXT NOT NULL DEFAULT 'active', terms TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS contract_items (id INTEGER PRIMARY KEY AUTOINCREMENT, contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE, label TEXT NOT NULL, value TEXT, sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE, invoice_number TEXT NOT NULL, issue_date TEXT NOT NULL, due_date TEXT, period_start TEXT, period_end TEXT, bill_to_name TEXT, client_address TEXT, gst_number TEXT, currency TEXT NOT NULL DEFAULT 'INR', subtotal REAL NOT NULL DEFAULT 0, tax_rate REAL NOT NULL DEFAULT 0, tax_amount REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, notes TEXT, status TEXT NOT NULL DEFAULT 'unpaid', paid_at TEXT, payment_method TEXT, payment_account TEXT, transaction_ref TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS invoice_items (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, description TEXT NOT NULL, qty REAL NOT NULL DEFAULT 1, unit_price REAL NOT NULL DEFAULT 0, amount REAL NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE, role TEXT NOT NULL DEFAULT 'poc', name TEXT, email TEXT, phone TEXT, location TEXT, linkedin TEXT, sort INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS activities (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE, kind TEXT NOT NULL DEFAULT 'note', title TEXT, body TEXT, occurred_at TEXT NOT NULL DEFAULT (datetime('now')), file TEXT, file_name TEXT, meta TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS approvals (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, detail TEXT, kind TEXT NOT NULL DEFAULT 'other', client_id INTEGER, contract_id INTEGER, invoice_id INTEGER, amount REAL, currency TEXT, status TEXT NOT NULL DEFAULT 'pending', requested_by TEXT, decided_by TEXT, decided_at TEXT, decision_note TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract ON invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issue ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_contacts_client ON contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_client ON activities(client_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
`;

const CLIENT_MIGRATIONS = [
  ['sales_stage', "sales_stage TEXT NOT NULL DEFAULT 'untouched'"], ['category', 'category TEXT'], ['segment', 'segment TEXT'],
  ['website', 'website TEXT'], ['total_campuses', 'total_campuses INTEGER'], ['locations', 'locations TEXT'],
  ['student_strength', 'student_strength INTEGER'], ['faculty_strength', 'faculty_strength INTEGER'],
  ['nirf', 'nirf INTEGER NOT NULL DEFAULT 0'], ['nirf_category', 'nirf_category TEXT'], ['nirf_rank', 'nirf_rank INTEGER'],
  ['qs_ranking', 'qs_ranking INTEGER NOT NULL DEFAULT 0'], ['qs_details', 'qs_details TEXT'], ['source', 'source TEXT'],
  ['projected_value', 'projected_value REAL'], ['expected_close', 'expected_close TEXT'], ['engagement_started', 'engagement_started TEXT'], ['issues', 'issues TEXT'],
];
const DEFAULT_SETTINGS = {
  org_name: 'Whitebird', org_tagline: 'AI Product Development', org_address: '', org_gstin: '', org_email: '', org_phone: '',
  default_currency: 'INR', default_tax_rate: '18', invoice_prefix: 'WB', invoice_next_seq: '1', invoice_due_days: '15', org_logo: '', accounts: '[]',
};

async function ensureColumn(table, col, ddl) {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  if (!info.rows.some((r) => r.name === col)) { try { await client.execute(`ALTER TABLE ${table} ADD COLUMN ${ddl}`); } catch (e) { console.warn('  skip', col, e.message); } }
}

console.log('Migrating', url.replace(/\/\/.*@/, '//'));
await client.executeMultiple(SCHEMA);
await ensureColumn('contracts', 'product', 'product TEXT');
await ensureColumn('invoices', 'template', "template TEXT NOT NULL DEFAULT 'classic'");
await ensureColumn('invoices', 'payment_proof', 'payment_proof TEXT');
await ensureColumn('invoices', 'template_mode', "template_mode TEXT NOT NULL DEFAULT 'light'");
for (const [c, ddl] of CLIENT_MIGRATIONS) await ensureColumn('clients', c, ddl);
await client.batch(Object.entries(DEFAULT_SETTINGS).map(([k, v]) => ({ sql: 'INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)', args: [k, v] })), 'write');
const t = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
console.log('Tables:', t.rows.map((r) => r.name).join(', '));
console.log('Migration complete.');
