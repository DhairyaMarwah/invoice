// Generate a small, spec-valid single-page contract PDF with extractable text.
// Byte offsets for the xref table are computed exactly so strict parsers accept it.
// Usage: node scripts/make-sample-pdf.mjs [outfile]
import fs from 'node:fs';

const lines = [
  'MASTER SERVICES AGREEMENT',
  '',
  'This Agreement is made by and between Whitebird AI Labs Pvt Ltd (the Provider)',
  'and Skyline Ventures Pvt Ltd (the Client).',
  '',
  'Effective Date: 01/04/2026',
  'Expiry Date: 31/03/2027',
  '',
  'Fees: The Client shall pay INR 1,500,000 per annum, exclusive of GST at 18%.',
  'Billing: Annual, in advance.',
  'Client GSTIN: 29ABCDE1234F1Z5',
  '',
  'Key Obligations:',
  '- Uptime SLA: 99.9% measured monthly',
  '- Support: 24x7 with 2 hour response for P1 incidents',
  '- Data Residency: Mumbai (ap-south-1)',
];

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
let content = 'BT /F1 12 Tf 50 760 Td 16 TL\n';
lines.forEach((l, i) => { content += (i === 0 ? '' : 'T* ') + `(${esc(l)}) Tj\n`; });
content += 'ET';
const contentLen = Buffer.byteLength(content, 'latin1');

const objs = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  `<< /Length ${contentLen} >>\nstream\n${content}\nendstream`,
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
];

let pdf = '%PDF-1.4\n';
const offsets = [];
objs.forEach((o, i) => {
  offsets.push(Buffer.byteLength(pdf, 'latin1'));
  pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
});
const xrefPos = Buffer.byteLength(pdf, 'latin1');
const n = objs.length + 1;
let xref = `xref\n0 ${n}\n0000000000 65535 f \n`;
for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`;
pdf += xref;
pdf += `trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

// Self-verify: each xref offset must land on "<i> 0 obj".
const buf = Buffer.from(pdf, 'latin1');
offsets.forEach((off, i) => {
  const tok = buf.toString('latin1', off, off + `${i + 1} 0 obj`.length);
  if (tok !== `${i + 1} 0 obj`) throw new Error(`xref offset ${i} wrong: got "${tok}"`);
});

const out = process.argv[2] || '/tmp/sample-contract.pdf';
fs.writeFileSync(out, buf);
console.log('Wrote', out, `(${buf.length} bytes, xref @ ${xrefPos}, offsets verified)`);
