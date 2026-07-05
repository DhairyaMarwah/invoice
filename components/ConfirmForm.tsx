'use client';

import type { ReactNode } from 'react';

/** A form that asks for confirmation before invoking a (destructive) server action. */
export function ConfirmForm({
  action,
  hidden,
  message,
  children,
  className = 'btn btn-ghost focus-ring',
}: {
  action: (fd: FormData) => void | Promise<void>;
  hidden?: Record<string, string | number>;
  message: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {hidden &&
        Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
