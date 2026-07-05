'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { UPLOAD_DIR } from '@/lib/db';
import * as repo from '@/lib/repo';
import { extract, type Extraction } from '@/lib/extract';
import type { Client, Contract } from '@/lib/types';

// ---- FormData helpers ----
const s = (fd: FormData, k: string): string => String(fd.get(k) ?? '').trim();
const sOrNull = (fd: FormData, k: string): string | null => {
  const v = s(fd, k);
  return v === '' ? null : v;
};
const n = (fd: FormData, k: string): number => {
  const v = parseFloat(String(fd.get(k) ?? '').replace(/,/g, ''));
  return isNaN(v) ? 0 : v;
};

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/heic': 'heic',
};

async function saveUpload(file: File, prefix = 'contract'): Promise<{ file: string; name: string } | null> {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const ext = EXT_BY_MIME[file.type] ?? (file.name?.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safe = `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, safe), buf);
  return { file: safe, name: file.name || safe };
}

function zip<T extends Record<string, unknown[]>>(fd: FormData, keys: (keyof T)[]): Record<keyof T, string[]> {
  const out = {} as Record<keyof T, string[]>;
  for (const k of keys) out[k] = fd.getAll(k as string).map((v) => String(v));
  return out;
}

// ============================================================ Clients
export async function createClientAction(fd: FormData): Promise<void> {
  const id = repo.createClient({
    name: s(fd, 'name') || 'Untitled Client',
    status: (s(fd, 'status') || 'prospective') as Client['status'],
    email: sOrNull(fd, 'email'),
    phone: sOrNull(fd, 'phone'),
    address: sOrNull(fd, 'address'),
    gst_number: sOrNull(fd, 'gst_number'),
    currency: s(fd, 'currency') || 'INR',
    notes: sOrNull(fd, 'notes'),
  });
  revalidatePath('/clients');
  revalidatePath('/');
  redirect(`/clients/${id}`);
}

export async function updateClientAction(fd: FormData): Promise<void> {
  const id = Number(s(fd, 'id'));
  repo.updateClient(id, {
    name: s(fd, 'name'),
    status: s(fd, 'status') as Client['status'],
    email: sOrNull(fd, 'email'),
    phone: sOrNull(fd, 'phone'),
    address: sOrNull(fd, 'address'),
    gst_number: sOrNull(fd, 'gst_number'),
    currency: s(fd, 'currency') || 'INR',
    notes: sOrNull(fd, 'notes'),
  });
  revalidatePath('/clients');
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export async function deleteClientAction(fd: FormData): Promise<void> {
  repo.deleteClient(Number(s(fd, 'id')));
  revalidatePath('/clients');
  revalidatePath('/');
  redirect('/clients');
}

// ============================================================ Contracts
export async function extractContractAction(fd: FormData): Promise<Extraction | { error: string }> {
  const file = fd.get('file') as File | null;
  if (!file || typeof file === 'string' || file.size === 0) return { error: 'No file provided' };
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const useAI = s(fd, 'useAI') === '1';
    return await extract(buf, { useAI });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Extraction failed' };
  }
}

export async function createContractAction(fd: FormData): Promise<void> {
  const clientId = Number(s(fd, 'client_id'));
  const upload = await saveUpload(fd.get('file') as File);
  const z = zip(fd, ['item_label', 'item_value']);
  const items = z.item_label.map((label, i) => ({ label, value: z.item_value[i] ?? '' }));
  const id = repo.createContract(
    {
      client_id: clientId,
      title: s(fd, 'title') || 'Untitled Contract',
      party: sOrNull(fd, 'party'),
      pdf_file: upload?.file ?? null,
      pdf_name: upload?.name ?? null,
      start_date: sOrNull(fd, 'start_date'),
      end_date: sOrNull(fd, 'end_date'),
      billing_cycle: (s(fd, 'billing_cycle') || 'annual') as Contract['billing_cycle'],
      amount: n(fd, 'amount'),
      currency: s(fd, 'currency') || 'INR',
      tax_rate: n(fd, 'tax_rate'),
      status: (s(fd, 'status') || 'active') as Contract['status'],
      product: sOrNull(fd, 'product'),
      terms: sOrNull(fd, 'terms'),
      notes: sOrNull(fd, 'notes'),
    },
    items,
  );
  revalidatePath('/contracts');
  revalidatePath(`/clients/${clientId}`);
  redirect(`/contracts/${id}`);
}

export async function updateContractAction(fd: FormData): Promise<void> {
  const id = Number(s(fd, 'id'));
  const upload = await saveUpload(fd.get('file') as File);
  const z = zip(fd, ['item_label', 'item_value']);
  const items = z.item_label.map((label, i) => ({ label, value: z.item_value[i] ?? '' }));
  repo.updateContract(
    id,
    {
      title: s(fd, 'title'),
      party: sOrNull(fd, 'party'),
      start_date: sOrNull(fd, 'start_date'),
      end_date: sOrNull(fd, 'end_date'),
      billing_cycle: s(fd, 'billing_cycle') as Contract['billing_cycle'],
      amount: n(fd, 'amount'),
      currency: s(fd, 'currency') || 'INR',
      tax_rate: n(fd, 'tax_rate'),
      status: s(fd, 'status') as Contract['status'],
      product: sOrNull(fd, 'product'),
      terms: sOrNull(fd, 'terms'),
      notes: sOrNull(fd, 'notes'),
    },
    items,
  );
  if (upload) repo.setContractPdf(id, upload.file, upload.name);
  revalidatePath('/contracts');
  revalidatePath(`/contracts/${id}`);
  redirect(`/contracts/${id}`);
}

export async function deleteContractAction(fd: FormData): Promise<void> {
  const id = Number(s(fd, 'id'));
  const clientId = s(fd, 'client_id');
  repo.deleteContract(id);
  revalidatePath('/contracts');
  if (clientId) revalidatePath(`/clients/${clientId}`);
  redirect(clientId ? `/clients/${clientId}` : '/contracts');
}

// ============================================================ Invoices
function readInvoiceItems(fd: FormData) {
  const z = zip(fd, ['desc', 'qty', 'price']);
  return z.desc.map((description, i) => ({
    description,
    qty: parseFloat(z.qty[i] || '0') || 0,
    unit_price: parseFloat((z.price[i] || '0').replace(/,/g, '')) || 0,
  }));
}

export async function createInvoiceAction(fd: FormData): Promise<void> {
  const items = readInvoiceItems(fd);
  const id = repo.createInvoice(
    {
      contract_id: Number(s(fd, 'contract_id')),
      client_id: Number(s(fd, 'client_id')),
      invoice_number: s(fd, 'invoice_number'),
      issue_date: s(fd, 'issue_date'),
      due_date: sOrNull(fd, 'due_date'),
      period_start: sOrNull(fd, 'period_start'),
      period_end: sOrNull(fd, 'period_end'),
      bill_to_name: sOrNull(fd, 'bill_to_name'),
      client_address: sOrNull(fd, 'client_address'),
      gst_number: sOrNull(fd, 'gst_number'),
      currency: s(fd, 'currency') || 'INR',
      tax_rate: n(fd, 'tax_rate'),
      template: s(fd, 'template') || 'classic',
      template_mode: s(fd, 'template_mode') === 'dark' ? 'dark' : 'light',
      notes: sOrNull(fd, 'notes'),
    },
    items,
    { bumpSeq: s(fd, 'bump_seq') === '1' },
  );
  revalidatePath('/invoices');
  revalidatePath('/');
  redirect(`/invoices/${id}`);
}

export async function updateInvoiceAction(fd: FormData): Promise<void> {
  const id = Number(s(fd, 'id'));
  const items = readInvoiceItems(fd);
  repo.updateInvoice(
    id,
    {
      invoice_number: s(fd, 'invoice_number'),
      issue_date: s(fd, 'issue_date'),
      due_date: sOrNull(fd, 'due_date'),
      period_start: sOrNull(fd, 'period_start'),
      period_end: sOrNull(fd, 'period_end'),
      bill_to_name: sOrNull(fd, 'bill_to_name'),
      client_address: sOrNull(fd, 'client_address'),
      gst_number: sOrNull(fd, 'gst_number'),
      currency: s(fd, 'currency') || 'INR',
      tax_rate: n(fd, 'tax_rate'),
      template: s(fd, 'template') || 'classic',
      template_mode: s(fd, 'template_mode') === 'dark' ? 'dark' : 'light',
      notes: sOrNull(fd, 'notes'),
    },
    items,
  );
  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export interface MarkPaidResult {
  ok: boolean;
  errors?: Record<string, string>;
}

export async function markPaidAction(fd: FormData): Promise<MarkPaidResult> {
  const id = Number(s(fd, 'id'));
  const paid_at = s(fd, 'paid_at');
  const payment_method = s(fd, 'payment_method');
  const transaction_ref = s(fd, 'transaction_ref');

  const errors: Record<string, string> = {};
  if (!paid_at) errors.paid_at = 'Pick the date the payment landed.';
  else if (paid_at > new Date().toISOString().slice(0, 10)) errors.paid_at = 'Payment date is in the future.';
  if (!payment_method) errors.payment_method = 'Pick how it was paid.';
  if (payment_method !== 'cash' && !transaction_ref) errors.transaction_ref = 'Add the UTR / transaction number.';

  const proofFile = fd.get('proof') as File | null;
  if (proofFile && typeof proofFile !== 'string' && proofFile.size > 0) {
    if (!proofFile.type.startsWith('image/')) errors.proof = 'Proof must be an image (screenshot or photo).';
    else if (proofFile.size > 10 * 1024 * 1024) errors.proof = 'Image is over 10 MB — attach a smaller one.';
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  const proof = proofFile ? await saveUpload(proofFile as File, 'proof') : null;
  repo.markPaid(id, {
    paid_at,
    payment_method,
    payment_account: s(fd, 'payment_account'),
    transaction_ref,
    payment_proof: proof?.file ?? null,
  });
  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}`);
  revalidatePath('/');
  return { ok: true };
}

export async function markUnpaidAction(fd: FormData): Promise<void> {
  const id = Number(s(fd, 'id'));
  repo.markUnpaid(id);
  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}`);
  revalidatePath('/');
}

export async function deleteInvoiceAction(fd: FormData): Promise<void> {
  const id = Number(s(fd, 'id'));
  const back = s(fd, 'back');
  repo.deleteInvoice(id);
  revalidatePath('/invoices');
  revalidatePath('/');
  redirect(back || '/invoices');
}

// ============================================================ Settings
export async function updateSettingsAction(fd: FormData): Promise<void> {
  const logoFile = fd.get('logo') as File | null;
  const logo = logoFile && typeof logoFile !== 'string' && logoFile.size > 0 && logoFile.type.startsWith('image/')
    ? await saveUpload(logoFile, 'logo')
    : null;
  const labels = fd.getAll('account_label').map((v) => String(v).trim());
  const details = fd.getAll('account_details').map((v) => String(v).trim());
  const accounts = labels
    .map((label, i) => ({ label, details: details[i] ?? '' }))
    .filter((a) => a.label || a.details);
  repo.updateSettings({
    org_name: s(fd, 'org_name'),
    org_tagline: s(fd, 'org_tagline'),
    org_address: s(fd, 'org_address'),
    org_gstin: s(fd, 'org_gstin'),
    org_email: s(fd, 'org_email'),
    org_phone: s(fd, 'org_phone'),
    default_currency: s(fd, 'default_currency') || 'INR',
    default_tax_rate: s(fd, 'default_tax_rate') || '18',
    invoice_prefix: s(fd, 'invoice_prefix') || 'INV',
    invoice_next_seq: s(fd, 'invoice_next_seq') || '1',
    invoice_due_days: s(fd, 'invoice_due_days') || '15',
    accounts: JSON.stringify(accounts),
    ...(logo ? { org_logo: logo.file } : {}),
    ...(s(fd, 'remove_logo') === '1' ? { org_logo: '' } : {}),
  });
  revalidatePath('/settings');
  redirect('/settings?saved=1');
}
