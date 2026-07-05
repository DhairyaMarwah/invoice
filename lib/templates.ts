// Invoice sheet templates. The first three set Geist Sans; the last two are
// the creative pair (Instrument Serif editorial / Geist Mono terminal).

export type TemplateKey = 'geist' | 'classic' | 'ledger' | 'minimal' | 'serif' | 'mono';

export const TEMPLATES: { key: TemplateKey; label: string; hint: string }[] = [
  { key: 'geist', label: 'Geist', hint: 'Full-bleed cell grid · Geist Sans + Mono' },
  { key: 'classic', label: 'Classic', hint: 'Soft panels · Geist Sans' },
  { key: 'ledger', label: 'Ledger', hint: 'Ruled table · Geist Sans' },
  { key: 'minimal', label: 'Minimal', hint: 'Hairlines only · Geist Sans' },
  { key: 'serif', label: 'Editorial', hint: 'Instrument Serif display' },
  { key: 'mono', label: 'Terminal', hint: 'Geist Mono ledger' },
];

export function isTemplate(v: string | null | undefined): v is TemplateKey {
  return !!v && TEMPLATES.some((t) => t.key === v);
}
