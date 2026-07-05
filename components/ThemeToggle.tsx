'use client';

import { useEffect, useState } from 'react';
import { IconSun, IconMoon } from './icons';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {}
    setDark(next);
  }

  return (
    <button
      onClick={toggle}
      className="nav-item focus-ring"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
    >
      {dark ? <IconSun width={16} height={16} /> : <IconMoon width={16} height={16} />}
      <span>{dark ? 'Light' : 'Dark'} theme</span>
    </button>
  );
}
