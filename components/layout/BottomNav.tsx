'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { IconBook, IconHome, IconPin, IconPlus, IconSettings } from '@/components/ui/Icons';

const ITEMS = [
  { href: '/', label: 'ホーム', Icon: IconHome },
  { href: '/places', label: 'スポット', Icon: IconPin },
  { href: '/places/new', label: '追加', Icon: IconPlus, primary: true },
  { href: '/trips', label: 'しおり', Icon: IconBook },
  { href: '/settings', label: '設定', Icon: IconSettings },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/places/new') return pathname === '/places/new';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur md:hidden dark:border-ink-800 dark:bg-ink-950/95"
      aria-label="メインナビゲーション"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {ITEMS.map(({ href, label, Icon, primary }) => {
          const active = isActive(href);
          if (primary) {
            return (
              <li key={href} className="flex items-center px-1">
                <Link
                  href={href}
                  className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-white shadow-lift transition active:scale-95"
                  aria-label="スポットを追加"
                >
                  <Icon width={26} height={26} strokeWidth={2.2} />
                </Link>
              </li>
            );
          }
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition',
                  active ? 'text-brand-600 dark:text-brand-300' : 'text-ink-400 dark:text-ink-500',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon width={22} height={22} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
