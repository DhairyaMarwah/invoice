import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { UPLOAD_DIR } from '@/lib/storage';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  // Only allow simple filenames — no path traversal.
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name.includes('..')) {
    return new Response('Bad request', { status: 400 });
  }
  const filePath = path.join(UPLOAD_DIR, name);
  if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
    return new Response('Not found', { status: 404 });
  }
  const data = fs.readFileSync(filePath);
  const TYPES: Record<string, string> = {
    pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    webp: 'image/webp', svg: 'image/svg+xml', heic: 'image/heic',
  };
  const ext = (name.split('.').pop() || '').toLowerCase();
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="${name}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
