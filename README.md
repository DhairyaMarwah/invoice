# Ledger — Contracts & Invoices

A single point of management for every client, contract, and invoice in the
organisation. Built as an "estate": **Clients → Contracts → Invoices**, with
revenue reporting on top.

- **Clients** with a status lifecycle: Active · Prospective · Not Engaged · Inactive · Past
- **Contracts** nested under a client — upload the signed PDF (DocuSign export, etc.)
  and Ledger extracts the validity period, party, amount, billing cycle, GSTIN,
  and key obligations for you to review. Supports annual / monthly / weekly /
  one-time billing.
- **Invoices** nested under a contract — auto-generated and pre-filled from the
  contract + your org profile. GST number, client address, and issue date are all
  editable. Mark paid/unpaid with method, account, and transaction reference.
- **Reports** — revenue bifurcated by year, month, week, and client
  (invoiced vs. collected vs. outstanding), plus annual recurring revenue.

## Stack

- **Next.js 15** (App Router) + **React 19**, **TypeScript**
- **Tailwind CSS v4** with a hand-mapped **Geist** design system (light + dark)
- **SQLite** via Node's built-in `node:sqlite` — zero native dependencies, no ORM
- **unpdf** for server-side PDF text extraction
- Optional **Claude CLI** pass for sharper contract field extraction (auto-detected)

## Run it

```bash
npm install
npm run dev        # http://localhost:4322
```

The database and uploaded PDFs live under `./data/` (created on first run,
git-ignored). To build for production:

```bash
npm run build && npm start
```

## Demo data

```bash
npm run seed       # load example clients / contracts / invoices
npm run reset      # wipe all data (keeps your settings), start clean
```

Set your organisation profile, invoice numbering, tax defaults, and payout
accounts under **Settings** — these feed invoice generation.

## PDF extraction

On the New Contract screen, choose a signed PDF and click **Extract fields**.
Text is pulled server-side (`unpdf`) and fields are guessed with heuristics
(dates, amounts, currency, GSTIN, party, billing cycle). With **Use AI
extraction** enabled and the `claude` CLI available, it also runs a Claude pass
for the party/obligations and merges the results. Everything is editable before
saving.

Generate a test contract PDF:

```bash
node scripts/make-sample-pdf.mjs /tmp/sample-contract.pdf
```

## Data model

`clients` → `contracts` (+ `contract_items`) → `invoices` (+ `invoice_items`),
plus a `settings` key/value table. Deleting a client cascades to its contracts
and invoices.

## Notes & limitations

- **Currency:** each client / contract / invoice carries its own currency.
  Aggregate report totals sum face values and are **not** FX-converted, so they
  are meaningful per-currency (the app is INR-first).
- Auth is not included — this is a single-owner local portal. Put it behind your
  own auth/VPN before exposing it.
# invoice
