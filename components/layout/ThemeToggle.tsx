'use client';

import { useEffect, useState } from 'react';
import { IconMoon, IconSun } from '@/components/ui/Icons';

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('tabimemo-theme', next ? 'dark' : 'light');
    } catch {
      // プライベートブラウジングなどで保存できなくても動作は続ける
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={className ?? 'rounded-pill p-2 text-ink-500 transition hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'}
      aria-label={dark ? 'ライトモードにする' : 'ダークモードにする'}
    >
      {mounted && dark ? <IconSun /> : <IconMoon />}
    </button>
  );
}
