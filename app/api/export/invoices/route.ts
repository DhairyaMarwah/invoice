import { NextRequest } from 'next/server';
import { listInvoices } from '@/lib/repo';

function csvField(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** CSV export of invoices, honouring the list filters (?status=&year=&q=). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rows = listInvoices({
    status: sp.get('status') ?? undefined,
    year: sp.get('year') ?? undefined,
    q: sp.get('q') ?? undefined,
  });

  const header = [
    'invoice_number', 'status', 'client', 'contract', 'issue_date', 'due_date',
    'period_start', 'period_end', 'currency', 'subtotal', 'tax_rate', 'tax_amount', 'total',
    'paid_at', 'payment_method', 'payment_account', 'transaction_ref', 'gst_number',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([
      r.invoice_number, r.status, r.client_name, r.contract_title, r.issue_date, r.due_date,
      r.period_start, r.period_end, r.currency, r.subtotal, r.tax_rate, r.tax_amount, r.total,
      r.paid_at, r.payment_method, r.payment_account, r.transaction_ref, r.gst_number,
    ].map(csvField).join(','));
  }

  const year = sp.get('year');
  const name = `invoices${year && year !== 'all' ? '-' + year : ''}.csv`;
  return new Response(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
}
