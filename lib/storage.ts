import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Uploads: Vercel Blob in production (BLOB_READ_WRITE_TOKEN set), local disk in dev.
export const UPLOAD_DIR = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(process.cwd(), 'data', 'uploads');

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/heic': 'heic',
};

export interface Stored {
  /** Blob URL (prod) or bare filename (dev, served by /api/files). */
  key: string;
  /** Original filename for display. */
  name: string;
}

export async function saveUpload(file: File | null, prefix = 'contract'): Promise<Stored | null> {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  const ext = EXT_BY_MIME[file.type] ?? (file.name?.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const base = `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const res = await put(`ledger/${base}`, buf, {
      access: 'public',
      contentType: file.type || undefined,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { key: res.url, name: file.name || base };
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, base), buf);
  return { key: base, name: file.name || base };
}
