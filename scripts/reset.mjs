// Wipe all data (keeps settings). Usage: npm run reset
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const db = new DatabaseSync(path.join(process.cwd(), 'data', 'app.db'));
db.exec('PRAGMA foreign_keys = ON');
for (const t of ['activities', 'contacts', 'approvals', 'invoice_items', 'invoices', 'contract_items', 'contracts', 'clients']) {
  try { db.exec(`DELETE FROM ${t}`); } catch { /* table may not exist yet */ }
}
db.exec("UPDATE settings SET value='1' WHERE key='invoice_next_seq'");
console.log('Ledger data cleared.');
