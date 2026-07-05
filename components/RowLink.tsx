'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

/** A table row that navigates on click, without hijacking inner links/buttons. */
export function RowLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  const router = useRouter();
  return (
    <tr
      className={`row-link ${className}`}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest('a,button,input,select,label')) return;
        router.push(href);
      }}
    >
      {children}
    </tr>
  );
}
