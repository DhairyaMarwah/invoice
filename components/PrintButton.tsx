'use client';

import { IconDownload } from './icons';

export function PrintButton({ label = 'Print / PDF' }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="btn btn-secondary focus-ring">
      <IconDownload width={14} height={14} /> {label}
    </button>
  );
}
