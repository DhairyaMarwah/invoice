# Deploying Ledger

Ledger runs fully on **Vercel** with two managed backing services:

- **Database** → **Turso / libSQL** (networked SQLite; the app uses `@libsql/client`).
- **File uploads** (contract PDFs, org logo, payment proofs) → **Vercel Blob**.

Both are swapped in transparently: with no env vars the app falls back to a local
SQLite file (`./data/app.db`) and local disk uploads (`./data/uploads`), so local
dev needs zero setup. Set the env vars and it uses Turso + Blob instead.

The optional AI contract-extraction uses the **Vercel AI Gateway**
(`AI_GATEWAY_API_KEY`); omit it and extraction falls back to text heuristics.

---

## Vercel (recommended — whole app)

### 1. Provision Turso (database)
```bash
# https://turso.tech — install the CLI, then:
turso db create ledger
turso db show ledger --url          # -> LIBSQL_URL
turso db tokens create ledger       # -> LIBSQL_AUTH_TOKEN
```
Push the schema (idempotent) and, optionally, demo data:
```bash
# from ./ledger, with LIBSQL_URL + LIBSQL_AUTH_TOKEN in .env.local
npm run migrate      # creates tables + columns + default settings
npm run seed         # optional demo clients/contracts/invoices
```
> The app also self-migrates on first request (lazy `ensureSchema`), so `migrate`
> is only needed if you want to seed before the first boot.

### 2. Create a Vercel Blob store (uploads)
Vercel dashboard → **Storage → Blob → Create**. When linked to the project,
`BLOB_READ_WRITE_TOKEN` is injected into the deployment automatically.

### 3. Deploy
- Import the repo in Vercel (set the **Root Directory** to `ledger` if it's in a
  monorepo). Framework auto-detects as Next.js; `vercel.json` pins the build.
- Add **Environment Variables** (Production + Preview):

  | Variable | Required | Purpose |
  | --- | --- | --- |
  | `LIBSQL_URL` | ✅ | Turso database URL |
  | `LIBSQL_AUTH_TOKEN` | ✅ | Turso auth token |
  | `BLOB_READ_WRITE_TOKEN` | ✅ (auto if Blob store linked) | Upload storage |
  | `AI_GATEWAY_API_KEY` | optional | Contract OCR/extraction |

- Deploy. First request creates any missing schema automatically.

See `.env.example` for the full list.

---

## Local development
```bash
cp .env.example .env.local     # optional — fill in Turso/Blob to mirror prod
npm install
npm run dev                    # http://localhost:4322
```
- **No env vars** → uses `./data/app.db` + `./data/uploads` (nothing to install).
- **With `LIBSQL_URL`/`LIBSQL_AUTH_TOKEN`** → talks to hosted Turso.
- `npm run seed` / `npm run reset` operate on whichever DB the env points at.

---

## Alternative: Railway / Docker (single container + volume)

The repo still ships a `Dockerfile` (Next.js standalone, Node 24, non-root) and
`railway.json`. This path can run entirely self-contained — set **no** Turso/Blob
vars and mount a persistent volume at `/data` (the image sets `DATA_DIR=/data`), so
`app.db` + `uploads/` persist on disk. Or point it at Turso/Blob too.

```bash
docker build -t ledger .
docker run -p 3000:3000 -v ledger_data:/data \
  -e AI_GATEWAY_API_KEY=... ledger
# → http://localhost:3000
```
On Railway: New Project → Deploy from GitHub repo (root dir `ledger`), add a Volume
mounted at `/data`. Railway injects `PORT`; the server binds `0.0.0.0` already.

> Note: on Vercel the filesystem is ephemeral, so the local-file fallback must NOT
> be used there — always set `LIBSQL_*` and `BLOB_READ_WRITE_TOKEN` for Vercel.
