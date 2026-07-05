import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="t-mono text-[13px] text-faint">404</span>
      <h1 className="t-h1 text-balance">This page doesn’t exist</h1>
      <p className="t-body max-w-sm text-pretty text-muted">The client, contract, or invoice you’re looking for may have been deleted.</p>
      <Link href="/" className="btn btn-primary focus-ring mt-2">Back to Overview</Link>
    </div>
  );
}
