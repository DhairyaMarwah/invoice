// Optional demo data so the dashboard/reports aren't empty on first look.
// Usage: npm run seed   ·   Clear it any time with: npm run reset
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const db = new DatabaseSync(path.join(process.cwd(), 'data', 'app.db'));
db.exec('PRAGMA foreign_keys = ON');

// Same additive migrations the app applies (so seeding a fresh db works too)
function ensureColumn(table, col, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}
try {
  ensureColumn('contracts', 'product', 'product TEXT');
  ensureColumn('invoices', 'template', "template TEXT NOT NULL DEFAULT 'classic'");
  ensureColumn('invoices', 'payment_proof', 'payment_proof TEXT');
  ensureColumn('invoices', 'template_mode', "template_mode TEXT NOT NULL DEFAULT 'light'");
} catch { /* table may not exist yet on a brand-new db — the app creates it */ }

for (const t of ['invoice_items', 'invoices', 'contract_items', 'contracts', 'clients']) db.exec(`DELETE FROM ${t}`);

const client = db.prepare(
  `INSERT INTO clients(name,status,email,phone,address,gst_number,currency,notes) VALUES(?,?,?,?,?,?,?,?)`,
);
const contract = db.prepare(
  `INSERT INTO contracts(client_id,title,party,start_date,end_date,billing_cycle,amount,currency,tax_rate,status,terms,product) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
);
const cItem = db.prepare(`INSERT INTO contract_items(contract_id,label,value,sort) VALUES(?,?,?,?)`);
const inv = db.prepare(
  `INSERT INTO invoices(contract_id,client_id,invoice_number,issue_date,due_date,period_start,period_end,bill_to_name,client_address,gst_number,currency,subtotal,tax_rate,tax_amount,total,status,paid_at,payment_method,payment_account,transaction_ref)
   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
);
const invItem = db.prepare(`INSERT INTO invoice_items(invoice_id,description,qty,unit_price,amount,sort) VALUES(?,?,?,?,?,?)`);

function invoice(cid, clid, num, issue, due, sub, rate, status, addr, gst, cur = 'INR', pay) {
  const tax = +(sub * rate / 100).toFixed(2);
  const total = +(sub + tax).toFixed(2);
  const r = inv.run(cid, clid, num, issue, due, issue, due, null, addr, gst, cur, sub, rate, tax, total,
    status, pay?.at ?? null, pay?.method ?? null, pay?.acct ?? null, pay?.ref ?? null);
  invItem.run(Number(r.lastInsertRowid), 'Subscription — billing period', 1, sub, sub, 0);
}

// --- Clients ---
const acme = Number(client.run('Acme Retail Pvt Ltd', 'active', 'ap@acme.example', '+91 98100 11223', 'Plot 21, DLF Cyber City\nGurugram, Haryana 122002', '06ABCDE1234F1Z5', 'INR', 'Flagship account.').lastInsertRowid);
const nimbus = Number(client.run('Nimbus Health Systems', 'active', 'billing@nimbus.example', '+91 80500 77889', 'ITPL Main Rd, Whitefield, Bengaluru 560066', '29NIMBU5678H1Z3', 'INR', 'Clinical NLP account.').lastInsertRowid);
const vertex = Number(client.run('Vertex Logistics', 'prospective', 'cfo@vertex.example', '+91 90000 44556', 'MIDC, Andheri East, Mumbai 400093', '27PQRSX6789K1Z2', 'INR', 'Pilot discussion.').lastInsertRowid);
const orbit = Number(client.run('Orbit Media', 'past', 'accounts@orbit.example', '', 'Koramangala, Bengaluru 560095', '29LMNOP4321Q1Z9', 'INR', 'Engagement ended 2025.').lastInsertRowid);
Number(client.run('Delta Foods', 'not_engaged', 'hello@delta.example', '', 'Pune 411001', '', 'INR', 'Paused.').lastInsertRowid);

// --- Contracts + invoices ---
const acmeC = Number(contract.run(acme, 'AI Recommendation Engine — SaaS', 'Acme Retail Pvt Ltd', '2025-04-01', '2026-03-31', 'annual', 1200000, 'INR', 18, 'active', 'Annual SaaS subscription for the AI recommendation platform, billed yearly in advance.', 'iris-discover').lastInsertRowid);
cItem.run(acmeC, 'Uptime SLA', '99.9% monthly', 0);
cItem.run(acmeC, 'Support', '24×7, 2h response for P1', 1);
cItem.run(acmeC, 'Data residency', 'Mumbai (ap-south-1)', 2);
invoice(acmeC, acme, 'WB-2025-0001', '2025-04-02', '2025-04-17', 1200000, 18, 'paid', 'Plot 21, DLF Cyber City, Gurugram 122002', '06ABCDE1234F1Z5', 'INR', { at: '2025-04-15', method: 'bank_transfer', acct: 'HDFC Current ••1234', ref: 'UTR2504150098' });

const acmeC2 = Number(contract.run(acme, 'Chatbot Add-on — Monthly', 'Acme Retail Pvt Ltd', '2025-06-01', '2026-05-31', 'monthly', 90000, 'INR', 18, 'active', 'Monthly conversational AI add-on.', 'iris-engage').lastInsertRowid);
cItem.run(acmeC2, 'Message volume', 'Up to 100k / month', 0);
for (let i = 0; i < 6; i++) {
  const m = 6 + i;
  const issue = `2025-${String(m).padStart(2, '0')}-03`;
  const due = `2025-${String(m).padStart(2, '0')}-18`;
  const paid = i < 4;
  invoice(acmeC2, acme, `WB-2025-${String(10 + i).padStart(4, '0')}`, issue, due, 90000, 18, paid ? 'paid' : 'unpaid',
    'Plot 21, DLF Cyber City, Gurugram 122002', '06ABCDE1234F1Z5', 'INR',
    paid ? { at: due, method: 'upi', acct: 'HDFC Current ••1234', ref: `UPI${m}0092` } : undefined);
}

const nimbusC = Number(contract.run(nimbus, 'Clinical NLP Platform — SaaS', 'Nimbus Health Systems', '2026-01-01', '2026-12-31', 'annual', 900000, 'INR', 18, 'active', 'Annual license for the clinical NLP platform.', 'pegasus-labs').lastInsertRowid);
cItem.run(nimbusC, 'Compliance', 'ISO 27001 + audit logs', 0);
cItem.run(nimbusC, 'Uptime SLA', '99.95%', 1);
invoice(nimbusC, nimbus, 'WB-2026-0001', '2026-01-05', '2026-01-20', 900000, 18, 'paid', 'ITPL Main Rd, Whitefield, Bengaluru 560066', '29NIMBU5678H1Z3', 'INR', { at: '2026-01-18', method: 'bank_transfer', acct: 'HDFC Current ••1234', ref: 'UTR2601180077' });

const orbitC = Number(contract.run(orbit, 'Content Tagging — One-time', 'Orbit Media', '2024-09-01', '2024-12-31', 'one_time', 450000, 'INR', 18, 'terminated', 'One-time model training + delivery.', 'pegasus-assess').lastInsertRowid);
invoice(orbitC, orbit, 'WB-2024-0001', '2024-09-10', '2024-09-25', 450000, 18, 'paid', 'Koramangala, Bengaluru 560095', '29LMNOP4321Q1Z9', 'INR', { at: '2024-09-22', method: 'cheque', acct: 'HDFC Current ••1234', ref: 'CHQ889201' });

// Overdue example for Nimbus (recurring monthly support, unpaid + past due)
const nimbusC2 = Number(contract.run(nimbus, 'Priority Support — Monthly', 'Nimbus Health Systems', '2026-01-01', '2026-12-31', 'monthly', 30000, 'INR', 18, 'active', 'Monthly priority support retainer.', 'atlas-erp').lastInsertRowid);
invoice(nimbusC2, nimbus, 'WB-2026-0007', '2026-05-02', '2026-05-17', 30000, 18, 'unpaid', 'ITPL Main Rd, Whitefield, Bengaluru 560066', '29NIMBU5678H1Z3', 'INR');

// Vertex pilot — active contract expiring within 60 days (drives "Expiring soon")
const vertexC = Number(contract.run(vertex, 'Route Optimisation Pilot', 'Vertex Logistics', '2026-01-25', '2026-08-20', 'annual', 300000, 'INR', 18, 'active', 'Annual pilot; renewal under discussion.', 'atlas-finance').lastInsertRowid);
cItem.run(vertexC, 'Scope', 'Up to 50 delivery hubs', 0);
invoice(vertexC, vertex, 'WB-2026-0004', '2026-01-28', '2026-02-12', 300000, 18, 'paid', 'MIDC, Andheri East, Mumbai 400093', '27PQRSX6789K1Z2', 'INR', { at: '2026-02-10', method: 'upi', acct: 'HDFC Current ••1234', ref: 'UPI2602100045' });

db.exec("UPDATE settings SET value='20' WHERE key='invoice_next_seq'");
db.exec("UPDATE settings SET value='Whitebird' WHERE key='org_name'");
db.exec("UPDATE settings SET value='34AABCW1234M1Z7' WHERE key='org_gstin'");
db.exec("UPDATE settings SET value='WeWork Galaxy, Residency Road, Bengaluru 560025' WHERE key='org_address'");
db.exec("UPDATE settings SET value='accounts@whitebird.ai' WHERE key='org_email'");
db.exec(`UPDATE settings SET value='${JSON.stringify([{ label: 'HDFC Current ••1234', details: 'A/C 50200012341234 · IFSC HDFC0000123' }, { label: 'ICICI USD ••9911', details: 'SWIFT ICICINBBXXX' }])}' WHERE key='accounts'`);

// Showcase the template variety on the seeded invoices
db.exec("UPDATE invoices SET template='geist', template_mode='dark' WHERE invoice_number='WB-2025-0001'");
db.exec("UPDATE invoices SET template='geist' WHERE invoice_number='WB-2025-0015'");
db.exec("UPDATE invoices SET template='ledger' WHERE invoice_number='WB-2025-0010'");
db.exec("UPDATE invoices SET template='serif' WHERE invoice_number='WB-2026-0001'");
db.exec("UPDATE invoices SET template='mono', template_mode='dark' WHERE invoice_number='WB-2026-0007'");
db.exec("UPDATE invoices SET template='minimal' WHERE invoice_number='WB-2026-0004'");

// Seed the Whitebird logo from the in-repo brand asset
try {
  const src = path.join(process.cwd(), 'public', 'brand', 'whitebird-logo.svg');
  const uploads = path.join(process.cwd(), 'data', 'uploads');
  fs.mkdirSync(uploads, { recursive: true });
  fs.copyFileSync(src, path.join(uploads, 'logo-whitebird.svg'));
  db.exec("INSERT INTO settings(key,value) VALUES('org_logo','logo-whitebird.svg') ON CONFLICT(key) DO UPDATE SET value='logo-whitebird.svg'");
} catch (e) { console.warn('logo seed skipped:', e.message); }

const n = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
console.log(`Seeded demo data: ${n('clients')} clients, ${n('contracts')} contracts, ${n('invoices')} invoices.`);
