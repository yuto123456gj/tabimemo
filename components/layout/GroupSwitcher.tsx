'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { switchGroup } from '@/lib/actions/groups';
import { IconChevronDown, IconUsers } from '@/components/ui/Icons';
import { cn } from '@/lib/utils/cn';
import type { GroupWithRole } from '@/lib/data/session';

export function GroupSwitcher({ groups, activeId }: { groups: GroupWithRole[]; activeId: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const active = groups.find((g) => g.id === activeId) ?? groups[0];

  if (!active) {
    return (
      <Link href="/groups" className="chip">
        <IconUsers width={16} height={16} />
        グループを作る
      </Link>
    );
  }

  const choose = (id: string) => {
    setOpen(false);
    if (id === active.id) return;
    startTransition(async () => {
      await switchGroup(id);
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn('chip max-w-[200px]', pending && 'opacity-60')}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <IconUsers width={16} height={16} className="shrink-0 text-accent-500" />
        <span className="truncate">{active.name}</span>
        <IconChevronDown width={14} height={14} className="shrink-0" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="閉じる"
            onClick={() => setOpen(false)}
          />
          <ul
            className="absolute right-0 z-50 mt-2 w-60 animate-pop-in overflow-hidden rounded-2xl border border-ink-100 bg-white py-1 shadow-card dark:border-ink-800 dark:bg-ink-900"
            role="listbox"
          >
            {groups.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => choose(g.id)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm transition hover:bg-ink-50 dark:hover:bg-ink-800',
                    g.id === active.id && 'font-semibold text-brand-600 dark:text-brand-300',
                  )}
                  role="option"
                  aria-selected={g.id === active.id}
                >
                  <span className="truncate">{g.name}</span>
                  <span className="shrink-0 text-xs text-ink-400">{g.member_count}人</span>
                </button>
              </li>
            ))}
            <li className="mt-1 border-t border-ink-100 pt-1 dark:border-ink-800">
              <Link
                href="/groups"
                onClick={() => setOpen(false)}
                className="block px-3.5 py-2.5 text-sm text-ink-600 transition hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800"
              >
                グループを管理・招待する
              </Link>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
