'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IconSearch } from './icons';

interface Segment { value: string; label: string; count?: number }
interface SelectFilter { key: string; label: string; options: { value: string; label: string }[] }

export function FilterBar({
  searchPlaceholder = 'Search…',
  segments,
  selects,
}: {
  searchPlaceholder?: string;
  segments?: Segment[];
  selects?: SelectFilter[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const first = useRef(true);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== 'all') next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  // Debounce the search box.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => setParam('q', q), 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeStatus = params.get('status') ?? 'all';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {segments && segments.length > 0 && (
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-panel p-0.5">
          {segments.map((s) => (
            <button
              key={s.value}
              onClick={() => setParam('status', s.value)}
              className={`focus-ring flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
                activeStatus === s.value ? 'bg-panel-2 text-fg shadow-[var(--shadow-card)]' : 'text-muted hover:text-fg'
              }`}
            >
              {s.label}
              {typeof s.count === 'number' && <span className="num text-faint">{s.count}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {selects?.map((sel) => (
          <select
            key={sel.key}
            defaultValue={params.get(sel.key) ?? 'all'}
            onChange={(e) => setParam(sel.key, e.target.value)}
            className="select focus-ring !h-8 w-auto"
            aria-label={sel.label}
          >
            {sel.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        <div className="flex h-8 items-center gap-2 rounded-md border border-border-strong bg-panel px-2.5 transition-colors focus-within:border-[color-mix(in_srgb,var(--ring)_55%,var(--border-strong))]">
          <IconSearch width={15} height={15} className="text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-40 bg-transparent text-[12.5px] outline-none placeholder:text-faint"
            type="search"
          />
        </div>
      </div>
    </div>
  );
}
