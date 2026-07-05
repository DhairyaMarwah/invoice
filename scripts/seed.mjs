// Optional demo data so the dashboard/reports/pipeline aren't empty on first look.
// Usage: npm run seed   ·   Clear it any time with: npm run reset
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const db = new DatabaseSync(path.join(process.cwd(), 'data', 'app.db'));
db.exec('PRAGMA foreign_keys = ON');

// Same additive schema the app applies (so seeding a fresh db works too)
function ensureColumn(table, col, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}
db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE, role TEXT NOT NULL DEFAULT 'poc', name TEXT, email TEXT, phone TEXT, location TEXT, linkedin TEXT, sort INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS activities (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE, kind TEXT NOT NULL DEFAULT 'note', title TEXT, body TEXT, occurred_at TEXT NOT NULL DEFAULT (datetime('now')), file TEXT, file_name TEXT, meta TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS approvals (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, detail TEXT, kind TEXT NOT NULL DEFAULT 'other', client_id INTEGER, contract_id INTEGER, invoice_id INTEGER, amount REAL, currency TEXT, status TEXT NOT NULL DEFAULT 'pending', requested_by TEXT, decided_by TEXT, decided_at TEXT, decision_note TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
`);
try {
  ensureColumn('contracts', 'product', 'product TEXT');
  ensureColumn('invoices', 'template', "template TEXT NOT NULL DEFAULT 'classic'");
  ensureColumn('invoices', 'payment_proof', 'payment_proof TEXT');
  ensureColumn('invoices', 'template_mode', "template_mode TEXT NOT NULL DEFAULT 'light'");
  for (const [c, ddl] of [
    ['sales_stage', "sales_stage TEXT NOT NULL DEFAULT 'untouched'"], ['category', 'category TEXT'], ['segment', 'segment TEXT'],
    ['website', 'website TEXT'], ['total_campuses', 'total_campuses INTEGER'], ['locations', 'locations TEXT'],
    ['student_strength', 'student_strength INTEGER'], ['faculty_strength', 'faculty_strength INTEGER'],
    ['nirf', 'nirf INTEGER NOT NULL DEFAULT 0'], ['nirf_category', 'nirf_category TEXT'], ['nirf_rank', 'nirf_rank INTEGER'],
    ['qs_ranking', 'qs_ranking INTEGER NOT NULL DEFAULT 0'], ['qs_details', 'qs_details TEXT'], ['source', 'source TEXT'],
    ['projected_value', 'projected_value REAL'], ['expected_close', 'expected_close TEXT'], ['engagement_started', 'engagement_started TEXT'], ['issues', 'issues TEXT'],
  ]) ensureColumn('clients', c, ddl);
} catch { /* base tables created by the app on first run */ }

for (const t of ['activities', 'contacts', 'approvals', 'invoice_items', 'invoices', 'contract_items', 'contracts', 'clients']) db.exec(`DELETE FROM ${t}`);

// ---- helpers ----
const clientStmt = db.prepare(`INSERT INTO clients
  (name,status,sales_stage,email,phone,address,gst_number,currency,notes,category,segment,website,total_campuses,locations,student_strength,faculty_strength,nirf,nirf_category,nirf_rank,qs_ranking,qs_details,source,projected_value,expected_close,engagement_started,issues)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const addClient = (o) => Number(clientStmt.run(
  o.name, o.status, o.stage, o.email ?? null, o.phone ?? null, o.address ?? null, o.gst ?? null, o.currency ?? 'INR', o.notes ?? null,
  o.category ?? null, o.segment ?? null, o.website ?? null, o.campuses ?? null, o.locations ?? null, o.students ?? null, o.faculty ?? null,
  o.nirf ? 1 : 0, o.nirfCat ?? null, o.nirfRank ?? null, o.qs ? 1 : 0, o.qsDetails ?? null, o.source ?? null,
  o.projected ?? null, o.close ?? null, o.started ?? null, o.issues ?? null,
).lastInsertRowid);

const contactStmt = db.prepare(`INSERT INTO contacts(client_id,role,name,email,phone,location,linkedin,sort) VALUES(?,?,?,?,?,?,?,?)`);
const addContacts = (cid, arr) => arr.forEach((c, i) => contactStmt.run(cid, c.role, c.name, c.email ?? null, c.phone ?? null, c.location ?? null, c.linkedin ?? null, i));

const actStmt = db.prepare(`INSERT INTO activities(client_id,kind,title,body,occurred_at,meta) VALUES(?,?,?,?,?,?)`);
const act = (cid, kind, title, when, body = null, meta = null) => actStmt.run(cid, kind, title, body, when, meta ? JSON.stringify(meta) : null);

const contract = db.prepare(`INSERT INTO contracts(client_id,title,party,start_date,end_date,billing_cycle,amount,currency,tax_rate,status,terms,product) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);
const cItem = db.prepare(`INSERT INTO contract_items(contract_id,label,value,sort) VALUES(?,?,?,?)`);
const inv = db.prepare(`INSERT INTO invoices(contract_id,client_id,invoice_number,issue_date,due_date,period_start,period_end,bill_to_name,client_address,gst_number,currency,subtotal,tax_rate,tax_amount,total,status,paid_at,payment_method,payment_account,transaction_ref) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const invItem = db.prepare(`INSERT INTO invoice_items(invoice_id,description,qty,unit_price,amount,sort) VALUES(?,?,?,?,?,?)`);
function invoice(cid, clid, num, issue, due, sub, rate, status, addr, gst, cur = 'INR', pay, desc = 'Subscription — billing period') {
  const tax = +(sub * rate / 100).toFixed(2);
  const total = +(sub + tax).toFixed(2);
  const r = inv.run(cid, clid, num, issue, due, issue, due, null, addr, gst, cur, sub, rate, tax, total, status, pay?.at ?? null, pay?.method ?? null, pay?.acct ?? null, pay?.ref ?? null);
  invItem.run(Number(r.lastInsertRowid), desc, 1, sub, sub, 0);
}
const approvalStmt = db.prepare(`INSERT INTO approvals(title,detail,kind,client_id,amount,currency,status,requested_by,decided_by,decided_at,decision_note,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);

const li = (h) => `https://www.linkedin.com/in/${h}`;

// ================= Customers (with contracts + invoices) =================
const sharda = addClient({
  name: 'Sharda University', status: 'active', stage: 'active_customer', category: 'private', segment: 'university',
  email: 'registrar@sharda.example', phone: '+91 120 400 0000', website: 'https://sharda.example',
  address: 'Plot 32-34, Knowledge Park III, Greater Noida 201310', gst: '09SHARD1234F1Z5',
  campuses: 3, locations: 'Greater Noida, Agra, Mathura', students: 42000, faculty: 2100,
  nirf: 1, nirfCat: 'Universities', nirfRank: 86, source: 'Referral', started: '2024-11-10',
  notes: 'Flagship account — multi-product.',
});
addContacts(sharda, [
  { role: 'poc', name: 'Dr. Anita Rao', email: 'anita.rao@sharda.example', phone: '+91 98110 22334', location: 'Greater Noida', linkedin: li('anita-rao') },
  { role: 'promoter', name: 'P. K. Gupta', email: 'chancellor@sharda.example', phone: '+91 98110 99887', location: 'Greater Noida', linkedin: li('pk-gupta') },
  { role: 'accounts', name: 'Sunil Mehta', email: 'accounts@sharda.example', phone: '+91 120 400 0012', location: 'Greater Noida' },
]);
const shardaC = Number(contract.run(sharda, 'Iris Discover — Generative University Website', 'Sharda University', '2025-04-01', '2026-03-31', 'annual', 1200000, 'INR', 18, 'active', 'Annual SaaS subscription, billed yearly in advance.', 'iris-discover').lastInsertRowid);
cItem.run(shardaC, 'Uptime SLA', '99.9% monthly', 0);
cItem.run(shardaC, 'Support', '24×7, 2h response for P1', 1);
invoice(shardaC, sharda, 'WB-2025-0001', '2025-04-02', '2025-04-17', 1200000, 18, 'paid', 'Knowledge Park III, Greater Noida 201310', '09SHARD1234F1Z5', 'INR', { at: '2025-04-15', method: 'bank_transfer', acct: 'HDFC Current ••1234', ref: 'UTR2504150098' }, 'Iris Discover — annual licence');
const shardaC2 = Number(contract.run(sharda, 'Iris Engage — Student Engagement', 'Sharda University', '2025-06-01', '2026-05-31', 'monthly', 90000, 'INR', 18, 'active', 'Monthly engagement platform.', 'iris-engage').lastInsertRowid);
for (let i = 0; i < 6; i++) {
  const m = 6 + i, issue = `2025-${String(m).padStart(2, '0')}-03`, due = `2025-${String(m).padStart(2, '0')}-18`, paid = i < 4;
  invoice(shardaC2, sharda, `WB-2025-${String(10 + i).padStart(4, '0')}`, issue, due, 90000, 18, paid ? 'paid' : 'unpaid', 'Knowledge Park III, Greater Noida 201310', '09SHARD1234F1Z5', 'INR', paid ? { at: due, method: 'upi', acct: 'HDFC Current ••1234', ref: `UPI${m}0092` } : undefined, 'Iris Engage — monthly');
}
act(sharda, 'meeting', 'QBR with registrar', '2026-06-28 06:30:00', 'Reviewed adoption; keen on Iris Enroll for next cycle.');
act(sharda, 'email', 'Renewal terms sent', '2026-06-20 11:00:00');

const nimbus = addClient({
  name: 'Nimbus Institute of Technology', status: 'active', stage: 'active_customer', category: 'private', segment: 'college',
  email: 'office@nimbus.example', phone: '+91 80 5077 8899', website: 'https://nimbus.example',
  address: 'ITPL Main Rd, Whitefield, Bengaluru 560066', gst: '29NIMBU5678H1Z3',
  campuses: 1, locations: 'Bengaluru', students: 8600, faculty: 480, source: 'Inbound', started: '2025-10-02',
  issues: 'Priority-support invoice overdue — finance following up.',
});
addContacts(nimbus, [
  { role: 'poc', name: 'Prof. Kevin Thomas', email: 'kevin.thomas@nimbus.example', phone: '+91 98450 11223', location: 'Bengaluru', linkedin: li('kevin-thomas') },
  { role: 'accounts', name: 'Rhea Nair', email: 'finance@nimbus.example', phone: '+91 80 5077 8810', location: 'Bengaluru' },
]);
const nimbusC = Number(contract.run(nimbus, 'Pegasus Labs — Virtual Labs', 'Nimbus Institute of Technology', '2026-01-01', '2026-12-31', 'annual', 900000, 'INR', 18, 'active', 'Annual licence for virtual labs.', 'pegasus-labs').lastInsertRowid);
cItem.run(nimbusC, 'Uptime SLA', '99.95%', 0);
invoice(nimbusC, nimbus, 'WB-2026-0001', '2026-01-05', '2026-01-20', 900000, 18, 'paid', 'Whitefield, Bengaluru 560066', '29NIMBU5678H1Z3', 'INR', { at: '2026-01-18', method: 'bank_transfer', acct: 'HDFC Current ••1234', ref: 'UTR2601180077' }, 'Pegasus Labs — annual');
const nimbusC2 = Number(contract.run(nimbus, 'Atlas ERP — Priority Support', 'Nimbus Institute of Technology', '2026-01-01', '2026-12-31', 'monthly', 30000, 'INR', 18, 'active', 'Monthly priority support retainer.', 'atlas-erp').lastInsertRowid);
invoice(nimbusC2, nimbus, 'WB-2026-0007', '2026-05-02', '2026-05-17', 30000, 18, 'unpaid', 'Whitefield, Bengaluru 560066', '29NIMBU5678H1Z3', 'INR', undefined, 'Atlas ERP — priority support');
act(nimbus, 'call', 'Chased overdue support invoice', '2026-06-30 09:15:00', 'Finance to release payment this week.');

const vertex = addClient({
  name: 'Vertex Skills Academy', status: 'prospective', stage: 'sales_cycle', category: 'private', segment: 'edtech',
  email: 'hello@vertex.example', phone: '+91 90000 44556', website: 'https://vertex.example',
  address: 'MIDC, Andheri East, Mumbai 400093', gst: '27PQRSX6789K1Z2',
  campuses: 0, locations: 'Mumbai (remote-first)', students: 120000, faculty: 60,
  source: 'Event / Conference', projected: 2500000, close: '2026-07-15', started: '2026-01-20',
  notes: 'Pilot live; negotiating annual.',
});
addContacts(vertex, [
  { role: 'poc', name: 'Meera Iyer', email: 'meera@vertex.example', phone: '+91 90000 44500', location: 'Mumbai', linkedin: li('meera-iyer') },
  { role: 'promoter', name: 'Rohan Kapoor', email: 'rohan@vertex.example', phone: '+91 90000 44501', location: 'Mumbai', linkedin: li('rohan-kapoor') },
]);
const vertexC = Number(contract.run(vertex, 'Atlas Finance — Pilot', 'Vertex Skills Academy', '2026-01-25', '2026-08-20', 'annual', 300000, 'INR', 18, 'active', 'Paid pilot; renewal under discussion.', 'atlas-finance').lastInsertRowid);
cItem.run(vertexC, 'Scope', 'Finance module, 3 seats', 0);
invoice(vertexC, vertex, 'WB-2026-0004', '2026-01-28', '2026-02-12', 300000, 18, 'paid', 'Andheri East, Mumbai 400093', '27PQRSX6789K1Z2', 'INR', { at: '2026-02-10', method: 'upi', acct: 'HDFC Current ••1234', ref: 'UPI2602100045' }, 'Atlas Finance — pilot');
act(vertex, 'meeting', 'Commercials discussion', '2026-07-02 07:00:00', 'Asked for 15% multi-year discount — raising for approval.');
act(vertex, 'proposal', 'Annual proposal shared', '2026-06-25 10:00:00', null, { amount: 2500000, currency: 'INR' });

const orbit = addClient({
  name: 'Orbit Public School', status: 'past', stage: 'past_customer', category: 'private', segment: 'k12',
  email: 'accounts@orbit.example', address: 'Koramangala, Bengaluru 560095', gst: '29LMNOP4321Q1Z9',
  campuses: 2, locations: 'Bengaluru', students: 3200, faculty: 180, source: 'Referral', started: '2024-08-01',
});
addContacts(orbit, [{ role: 'poc', name: 'Latha S', email: 'principal@orbit.example', phone: '+91 80 4123 0000', location: 'Bengaluru' }]);
const orbitC = Number(contract.run(orbit, 'Pegasus Assess — One-time', 'Orbit Public School', '2024-09-01', '2024-12-31', 'one_time', 450000, 'INR', 18, 'terminated', 'One-time assessment rollout.', 'pegasus-assess').lastInsertRowid);
invoice(orbitC, orbit, 'WB-2024-0001', '2024-09-10', '2024-09-25', 450000, 18, 'paid', 'Koramangala, Bengaluru 560095', '29LMNOP4321Q1Z9', 'INR', { at: '2024-09-22', method: 'cheque', acct: 'HDFC Current ••1234', ref: 'CHQ889201' }, 'Pegasus Assess — delivery');

// ================= Pure-pipeline prospects (no contracts) =================
const helix = addClient({ name: 'Helix University', status: 'prospective', stage: 'physical_meetings', category: 'private', segment: 'university', email: 'vc@helix.example', phone: '+91 141 250 0000', address: 'Jaipur 302017', campuses: 2, locations: 'Jaipur, Kota', students: 26000, faculty: 1300, nirf: 1, nirfCat: 'Universities', nirfRank: 142, source: 'Outbound', projected: 1800000, close: '2026-08-10', started: '2026-04-05' });
addContacts(helix, [{ role: 'poc', name: 'Dr. S. Verma', email: 'registrar@helix.example', phone: '+91 98290 11122', location: 'Jaipur', linkedin: li('s-verma') }, { role: 'promoter', name: 'Ajay Singhania', email: 'chair@helix.example', location: 'Jaipur', linkedin: li('ajay-singhania') }]);
act(helix, 'meeting', 'Campus visit + demo', '2026-07-01 05:30:00', 'Demoed Iris Discover + Enroll to the VC and deans.');
act(helix, 'email', 'Proposal follow-up', '2026-06-27 08:00:00');

const aurora = addClient({ name: 'Aurora College of Engineering', status: 'prospective', stage: 'active_communication', category: 'private', segment: 'college', email: 'info@aurora.example', phone: '+91 44 2815 0000', address: 'Chennai 600096', campuses: 1, locations: 'Chennai', students: 6400, faculty: 320, source: 'Website', projected: 700000, close: '2026-09-01', started: '2026-05-18' });
addContacts(aurora, [{ role: 'poc', name: 'Prof. Divya R', email: 'divya@aurora.example', phone: '+91 98400 55667', location: 'Chennai', linkedin: li('divya-r') }]);
act(aurora, 'call', 'Discovery call', '2026-06-24 06:00:00', 'Interested in placements + LMS.');

const meridian = addClient({ name: 'Meridian State University', status: 'prospective', stage: 'communication_started', category: 'government', segment: 'university', email: 'osd@meridian.gov.example', address: 'Bhopal 462001', campuses: 5, locations: 'Bhopal, Indore, Jabalpur', students: 88000, faculty: 3600, source: 'RFP / Tender', projected: 4200000, close: '2026-10-15', started: '2026-06-10', issues: 'Government procurement — GeM listing required before proposal.' });
addContacts(meridian, [{ role: 'poc', name: 'Dr. R. Malviya', email: 'osd@meridian.gov.example', phone: '+91 755 266 0000', location: 'Bhopal' }]);
act(meridian, 'email', 'Intro + capability deck', '2026-06-12 09:30:00');

addClient({ name: 'Crescent Global School', status: 'prospective', stage: 'untouched', category: 'private', segment: 'k12', locations: 'Hyderabad', students: 2400, faculty: 140, source: 'LinkedIn', projected: 350000 });

// ================= Approvals =================
approvalStmt.run('15% multi-year discount — Vertex', 'Vertex wants 15% off for a 3-year Atlas Finance commitment. Margin still healthy.', 'discount', vertex, 375000, 'INR', 'pending', 'You', null, null, null, '2026-07-02 07:10:00');
approvalStmt.run('Annual proposal — Helix University', 'Iris Discover + Enroll bundle at ₹18L. Approve before sending.', 'proposal', helix, 1800000, 'INR', 'pending', 'You', null, null, null, '2026-07-01 06:00:00');
approvalStmt.run('Waive late fee — Nimbus', 'Nimbus support invoice overdue; waive the late fee as a goodwill gesture.', 'invoice', nimbus, 0, 'INR', 'approved', 'You', 'You', '2026-06-30 10:00:00', 'Approved — long-standing account.', '2026-06-29 05:00:00');
approvalStmt.run('Sponsor EdTech summit booth', 'Marketing spend for a booth at the Mumbai EdTech summit.', 'expense', null, 250000, 'INR', 'rejected', 'You', 'You', '2026-06-20 11:00:00', 'Deferred to next quarter.', '2026-06-18 09:00:00');

// ---- settings ----
db.exec("UPDATE settings SET value='20' WHERE key='invoice_next_seq'");
db.exec("UPDATE settings SET value='Whitebird' WHERE key='org_name'");
db.exec("UPDATE settings SET value='AI Product Development' WHERE key='org_tagline'");
db.exec("UPDATE settings SET value='34AABCW1234M1Z7' WHERE key='org_gstin'");
db.exec("UPDATE settings SET value='WeWork Galaxy, Residency Road, Bengaluru 560025' WHERE key='org_address'");
db.exec("UPDATE settings SET value='accounts@whitebird.ai' WHERE key='org_email'");
db.exec(`UPDATE settings SET value='${JSON.stringify([{ label: 'HDFC Current ••1234', details: 'A/C 50200012341234 · IFSC HDFC0000123' }, { label: 'ICICI Current ••9911', details: 'A/C 00112233445566 · IFSC ICIC0000112' }])}' WHERE key='accounts'`);

// Template variety
db.exec("UPDATE invoices SET template='geist', template_mode='dark' WHERE invoice_number='WB-2025-0001'");
db.exec("UPDATE invoices SET template='geist' WHERE invoice_number='WB-2025-0015'");
db.exec("UPDATE invoices SET template='ledger' WHERE invoice_number='WB-2025-0010'");
db.exec("UPDATE invoices SET template='serif' WHERE invoice_number='WB-2026-0001'");
db.exec("UPDATE invoices SET template='mono', template_mode='dark' WHERE invoice_number='WB-2026-0007'");
db.exec("UPDATE invoices SET template='minimal' WHERE invoice_number='WB-2026-0004'");

// Logo from the in-repo brand asset
try {
  const src = path.join(process.cwd(), 'public', 'brand', 'whitebird-logo.svg');
  const uploads = path.join(process.cwd(), 'data', 'uploads');
  fs.mkdirSync(uploads, { recursive: true });
  fs.copyFileSync(src, path.join(uploads, 'logo-whitebird.svg'));
  db.exec("INSERT INTO settings(key,value) VALUES('org_logo','logo-whitebird.svg') ON CONFLICT(key) DO UPDATE SET value='logo-whitebird.svg'");
} catch (e) { console.warn('logo seed skipped:', e.message); }

const n = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
console.log(`Seeded: ${n('clients')} clients, ${n('contracts')} contracts, ${n('invoices')} invoices, ${n('contacts')} contacts, ${n('activities')} activities, ${n('approvals')} approvals.`);
