import 'server-only';
import { generateObject } from 'ai';
import { z } from 'zod';

export interface Guess {
  party?: string;
  start_date?: string;
  end_date?: string;
  amount?: number;
  currency?: string;
  billing_cycle?: string;
  tax_rate?: number;
  gst_number?: string;
  terms?: string;
  items?: { label: string; value: string }[];
}

export interface Extraction {
  text: string;
  pages: number;
  guess: Guess;
  source: 'heuristic' | 'ai';
}

// unpdf ships a serverless-friendly pdf.js build that works in the Next runtime.
export async function parsePdf(buffer: Buffer): Promise<{ text: string; pages: number }> {
  const { getDocumentProxy, extractText } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  return { text: (text || '').replace(/\r/g, ''), pages: totalPages || 0 };
}

// ---------------------------------------------------------------------------
// Heuristic extraction — regex over the PDF text layer. Zero-cost fallback,
// also used to backfill anything the AI pass leaves blank.
// ---------------------------------------------------------------------------
const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function iso(y: number, m: number, d: number): string | null {
  if (!y || !m || !d || m > 12 || d > 31) return null;
  if (y < 100) y += 2000;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Pull date-like tokens out of contract text, in document order, as ISO strings. */
function findDates(text: string): string[] {
  const out: { pos: number; iso: string }[] = [];
  const push = (pos: number, s: string | null) => {
    if (s) out.push({ pos, iso: s });
  };
  // 2025-01-31
  for (const m of text.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) push(m.index!, iso(+m[1], +m[2], +m[3]));
  // 31/01/2025 or 31-01-2025 or 31.01.2025  (day-first, common in IN/EU contracts)
  for (const m of text.matchAll(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/g)) push(m.index!, iso(+m[3], +m[2], +m[1]));
  // 1 January 2025 / 1st Jan, 2025
  for (const m of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/g)) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    push(m.index!, iso(+m[3], mo, +m[1]));
  }
  // January 1, 2025
  for (const m of text.matchAll(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/g)) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
    push(m.index!, iso(+m[3], mo, +m[2]));
  }
  out.sort((a, b) => a.pos - b.pos);
  const seen = new Set<string>();
  return out.map((o) => o.iso).filter((s) => (seen.has(s) ? false : (seen.add(s), true)));
}

function guessCurrency(text: string): string | undefined {
  if (/₹|\bINR\b|\bRs\.?\b|rupees/i.test(text)) return 'INR';
  if (/\bUSD\b|US\$|\$\s?\d/i.test(text)) return 'USD';
  if (/€|\bEUR\b/i.test(text)) return 'EUR';
  if (/£|\bGBP\b/i.test(text)) return 'GBP';
  if (/\bAED\b|dirham/i.test(text)) return 'AED';
  return undefined;
}

function guessAmount(text: string): number | undefined {
  const nums: number[] = [];
  for (const m of text.matchAll(/(?:₹|Rs\.?|INR|USD|US\$|\$|€|£|EUR|GBP)\s*([\d,]+(?:\.\d{1,2})?)/gi)) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (!isNaN(n) && n >= 100) nums.push(n);
  }
  if (!nums.length) return undefined;
  return Math.max(...nums);
}

function guessCycle(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/\bper annum\b|\bannual|\byearly|\bp\.a\.|\bper year\b/.test(t)) return 'annual';
  if (/\bper month|\bmonthly|\bp\.m\.|\bpermonth/.test(t)) return 'monthly';
  if (/\bper week|\bweekly/.test(t)) return 'weekly';
  if (/\bone[- ]?time|\blump ?sum|\bone off/.test(t)) return 'one_time';
  return undefined;
}

function guessGstin(text: string): string | undefined {
  // 15-char GSTIN: 2-digit state + 10-char PAN + entity + Z + checksum.
  const m = text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]\b/);
  return m ? m[0] : undefined;
}

const LEGAL = /(pvt\.? ?ltd|private limited|\bLLP\b|\bInc\.?\b|\bCorp\.?\b|\bLimited\b|\bLtd\.?\b|technolog|labs|solutions|systems|ventures|media|logistics)/i;
const clean = (s: string) => s.trim().replace(/\s+/g, ' ').replace(/^[,"“”\-\s]+|[,"“”\-\s]+$/g, '').slice(0, 100);

function guessParty(text: string): string | undefined {
  // Strongest signal: the entity explicitly labelled the Client/Customer.
  const marked = text.match(/([A-Z][A-Za-z0-9&.,'’\- ]{2,80}?)\s*\(?\s*(?:the\s+)?["“]?(?:Client|Customer)\b/);
  if (marked && LEGAL.test(marked[1])) return clean(marked[1]);
  // "by and between A and B" — pick whichever names a legal entity (prefer the 2nd).
  const between = text.match(/between\s+(.{3,120}?)\s+and\s+(.{3,120}?)[.,\n]/is);
  if (between) {
    const cand = [between[2], between[1]].find((s) => LEGAL.test(s));
    if (cand) return clean(cand);
  }
  const line = text.split('\n').find((l) => LEGAL.test(l));
  return line ? clean(line) : undefined;
}

export function heuristics(text: string): Guess {
  const dates = findDates(text);
  return {
    party: guessParty(text),
    start_date: dates[0],
    end_date: dates[1],
    amount: guessAmount(text),
    currency: guessCurrency(text),
    billing_cycle: guessCycle(text),
    gst_number: guessGstin(text),
    tax_rate: /18\s?%|gst/i.test(text) ? 18 : undefined,
    terms: text.trim().slice(0, 4000),
    items: [],
  };
}

// ---------------------------------------------------------------------------
// AI extraction — Vercel AI Gateway (AI_GATEWAY_API_KEY). The raw PDF goes to
// the model as a file part, so scanned/image contracts work too (real OCR).
// Same generateObject pattern as crm's form-extraction-service.
// ---------------------------------------------------------------------------
const OCR_MODEL = process.env.OCR_MODEL || 'anthropic/claude-haiku-4-5';

const guessSchema = z.object({
  party: z.string().describe('The client/counterparty legal name (not the vendor). "" if unknown.'),
  start_date: z.string().describe('Contract effective/start date as YYYY-MM-DD. "" if unknown.'),
  end_date: z.string().describe('Contract expiry/end date as YYYY-MM-DD. "" if unknown.'),
  amount: z.number().describe('The recurring or total contract value as a plain number, no separators. 0 if unknown.'),
  currency: z.string().describe('ISO currency code, e.g. INR, USD. "" if unknown.'),
  billing_cycle: z.enum(['annual', 'monthly', 'weekly', 'one_time', 'unknown']).describe('How the amount is charged.'),
  tax_rate: z.number().describe('GST/tax percentage as a number, e.g. 18. 0 if unknown.'),
  gst_number: z.string().describe("The client's GSTIN (15 chars) if present. \"\" if unknown."),
  items: z.array(z.object({ label: z.string(), value: z.string() }))
    .describe('Up to 6 key obligations/SLAs/deliverables to adhere to. Short label + short value each.'),
});

export function aiAvailable(): boolean {
  return !!process.env.AI_GATEWAY_API_KEY;
}

export async function aiExtract(buffer: Buffer): Promise<Guess | null> {
  if (!aiAvailable()) return null;
  try {
    const { object } = await generateObject({
      model: OCR_MODEL,
      schema: guessSchema,
      temperature: 0.1,
      abortSignal: AbortSignal.timeout(90_000),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract structured fields from this signed contract PDF. The vendor/provider is our own organisation; "party" must be the client/counterparty. Use "" or 0 for anything not present in the document — never invent values.',
            },
            { type: 'file', data: new Uint8Array(buffer), mediaType: 'application/pdf' },
          ],
        },
      ],
    });
    return {
      party: object.party || undefined,
      start_date: object.start_date || undefined,
      end_date: object.end_date || undefined,
      amount: object.amount || undefined,
      currency: object.currency || undefined,
      billing_cycle: object.billing_cycle === 'unknown' ? undefined : object.billing_cycle,
      tax_rate: object.tax_rate || undefined,
      gst_number: object.gst_number || undefined,
      items: (object.items || []).filter((it) => it.label || it.value).slice(0, 8),
    };
  } catch (e) {
    console.error('[extract] AI extraction failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function extract(buffer: Buffer, opts: { useAI?: boolean } = {}): Promise<Extraction> {
  let text = '';
  let pages = 0;
  try {
    ({ text, pages } = await parsePdf(buffer));
  } catch {
    // Scanned/image-only PDF — no text layer. The AI pass still works.
  }
  const base = heuristics(text);
  if (opts.useAI) {
    const ai = await aiExtract(buffer);
    if (ai) {
      // AI wins where present; heuristics backfill; terms always from the text layer.
      return {
        text,
        pages,
        source: 'ai',
        guess: {
          party: ai.party || base.party,
          start_date: ai.start_date || base.start_date,
          end_date: ai.end_date || base.end_date,
          amount: ai.amount || base.amount,
          currency: ai.currency || base.currency,
          billing_cycle: ai.billing_cycle || base.billing_cycle,
          tax_rate: ai.tax_rate || base.tax_rate,
          gst_number: ai.gst_number || base.gst_number,
          terms: base.terms,
          items: ai.items?.length ? ai.items : base.items,
        },
      };
    }
  }
  return { text, pages, guess: base, source: 'heuristic' };
}
