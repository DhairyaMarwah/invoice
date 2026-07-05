'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * True-A4 preview frame (invoicelly pattern): the frame keeps a 210/297
 * aspect ratio; the sheet inside is laid out at a fixed 794px design width
 * and scaled to the container, so typography stays proportional at any size.
 */
export function A4Frame({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 794);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={`a4-frame ${className}`}>
      <div
        className="a4-sheet"
        style={{ transform: `scale(${scale})`, visibility: scale ? 'visible' : 'hidden' }}
      >
        {children}
      </div>
    </div>
  );
}
