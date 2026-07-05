'use client';

import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="t-mono text-[13px] text-[var(--bad-text)]">Error</span>
      <h1 className="t-h1 text-balance">Something went wrong</h1>
      <p className="t-body max-w-md text-pretty text-muted">{error.message || 'An unexpected error occurred.'}</p>
      <div className="mt-2 flex gap-2">
        <button onClick={reset} className="btn btn-primary focus-ring">Try again</button>
        <Link href="/" className="btn btn-secondary focus-ring">Back to Overview</Link>
      </div>
    </div>
  );
}
