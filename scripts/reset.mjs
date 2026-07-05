// Wipe all data (keeps settings). Usage: npm run reset
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const db = new DatabaseSync(path.join(process.cwd(), 'data', 'app.db'));
for (const t of ['invoice_items', 'invoices', 'contract_items', 'contracts', 'clients']) {
  db.exec(`DELETE FROM ${t}`);
}
db.exec("UPDATE settings SET value='1' WHERE key='invoice_next_seq'");
console.log('Ledger data cleared.');
