// Wipe all data (keeps settings). Usage: node --env-file=.env.local scripts/reset.mjs
import { createClient } from '@libsql/client';

const url = process.env.LIBSQL_URL || process.env.TURSO_DATABASE_URL || 'file:./data/app.db';
const authToken = process.env.LIBSQL_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

for (const t of ['activities', 'contacts', 'approvals', 'invoice_items', 'invoices', 'contract_items', 'contracts', 'clients']) {
  try { await client.execute(`DELETE FROM ${t}`); } catch { /* table may not exist yet */ }
}
await client.execute("UPDATE settings SET value='1' WHERE key='invoice_next_seq'");
console.log('Ledger data cleared.');
