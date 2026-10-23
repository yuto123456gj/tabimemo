'use client';

import { useState } from 'react';
import { SearchTab } from './SearchTab';
import { LinkTab } from './LinkTab';
import { ImportTab } from './ImportTab';
import { cn } from '@/lib/utils/cn';
import type { PlaceList } from '@/types/database';

type Tab = 'search' | 'link' | 'import';

const TABS: Array<{ value: Tab; label: string; emoji: string }> = [
  { value: 'search', label: 'さがす', emoji: '🔎' },
  { value: 'link', label: 'リンクから', emoji: '🔗' },
  { value: 'import', label: 'インポート', emoji: '📥' },
];

export function AddPlaceTabs({
  groupId,
  lists,
  initialTab = 'search',
  sharedText = '',
  initialQuery = '',
}: {
  groupId: string;
  lists: PlaceList[];
  initialTab?: Tab;
  sharedText?: string;
  initialQuery?: string;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="追加方法" className="flex gap-1 rounded-pill bg-ink-100 p-1 dark:bg-ink-800">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'flex-1 rounded-pill px-2 py-2 text-sm font-semibold transition',
              tab === t.value
                ? 'bg-white text-brand-600 shadow-sm dark:bg-ink-900 dark:text-brand-300'
                : 'text-ink-500 dark:text-ink-300',
            )}
          >
            <span className="mr-1" aria-hidden="true">
              {t.emoji}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'search' && <SearchTab groupId={groupId} lists={lists} initialQuery={initialQuery} />}
        {tab === 'link' && <LinkTab groupId={groupId} lists={lists} initialText={sharedText} />}
        {tab === 'import' && <ImportTab groupId={groupId} />}
      </div>
    </div>
  );
}
