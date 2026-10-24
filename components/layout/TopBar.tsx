import Link from 'next/link';
import { APP_NAME_JA } from '@/lib/constants';
import { GroupSwitcher } from './GroupSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { IconBook, IconPin, IconSettings, IconUsers } from '@/components/ui/Icons';
import type { GroupWithRole } from '@/lib/data/session';

/** 上部バー（スマホではロゴ＋グループ切替、PCではナビも出す） */
export function TopBar({
  groups,
  activeGroupId,
}: {
  groups: GroupWithRole[];
  activeGroupId: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/90 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-gradient text-white shadow-sm">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s6-6 6-10.5A6 6 0 0 0 6 10.5C6 15 12 21 12 21Z" />
              <circle cx="12" cy="10.2" r="2" />
            </svg>
          </span>
          <span className="text-[17px]">{APP_NAME_JA}</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-0.5 md:flex lg:ml-4 lg:gap-1" aria-label="グローバルナビゲーション">
          <Link href="/places" className="flex items-center gap-1.5 rounded-pill px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-brand-600 dark:text-ink-300 dark:hover:bg-ink-800">
            <IconPin width={17} height={17} />
            スポット
          </Link>
          <Link href="/trips" className="flex items-center gap-1.5 rounded-pill px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-brand-600 dark:text-ink-300 dark:hover:bg-ink-800">
            <IconBook width={17} height={17} />
            しおり
          </Link>
          <Link href="/groups" className="flex items-center gap-1.5 rounded-pill px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-brand-600 dark:text-ink-300 dark:hover:bg-ink-800">
            <IconUsers width={17} height={17} />
            グループ
          </Link>
          <Link href="/settings" className="flex items-center gap-1.5 rounded-pill px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-brand-600 dark:text-ink-300 dark:hover:bg-ink-800">
            <IconSettings width={17} height={17} />
            設定
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <GroupSwitcher groups={groups} activeId={activeGroupId} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
