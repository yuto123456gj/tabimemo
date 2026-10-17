'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { IconPlus, IconTrash } from '@/components/ui/Icons';
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from '@/lib/actions/trips';
import { cn } from '@/lib/utils/cn';
import type { TripChecklistItem } from '@/types/database';

const SUGGESTIONS = ['充電器', 'モバイルバッテリー', '常備薬', '日焼け止め', '折りたたみ傘', 'エコバッグ'];

export function ChecklistPanel({ tripId, items }: { tripId: string; items: TripChecklistItem[] }) {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? '更新できませんでした。');
      else router.refresh();
    });
  };

  const add = (value: string) => {
    if (!value.trim()) return;
    run(async () => {
      const result = await addChecklistItem(tripId, value);
      if (result.ok) setLabel('');
      return result;
    });
  };

  const done = items.filter((i) => i.checked).length;

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">持ち物チェックリスト</h3>
        {items.length > 0 && (
          <span className="text-xs text-ink-400">
            {done}/{items.length} 完了
          </span>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {items.length > 0 && (
        <>
          <div className="h-1.5 overflow-hidden rounded-pill bg-ink-100 dark:bg-ink-800">
            <div
              className="h-full rounded-pill bg-accent-500 transition-all"
              style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
            />
          </div>
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-1">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    disabled={pending}
                    onChange={(e) => run(() => toggleChecklistItem(item.id, tripId, e.target.checked))}
                    className="h-5 w-5 shrink-0 rounded border-ink-300 text-accent-500 focus:ring-accent-400"
                  />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-sm',
                      item.checked && 'text-ink-400 line-through dark:text-ink-500',
                    )}
                  >
                    {item.label}
                  </span>
                </label>
                <button
                  type="button"
                  className="shrink-0 rounded-md p-1 text-ink-300 transition hover:text-red-500"
                  aria-label={`${item.label} を削除`}
                  disabled={pending}
                  onClick={() => run(() => deleteChecklistItem(item.id, tripId))}
                >
                  <IconTrash width={15} height={15} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex gap-2">
        <input
          className="input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="持ち物を追加"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(label);
            }
          }}
        />
        <Button variant="outline" onClick={() => add(label)} disabled={pending || !label.trim()}>
          {pending ? <Spinner /> : <IconPlus width={18} height={18} />}
        </Button>
      </div>

      {items.length === 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-ink-400">よく使うもの:</span>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip px-2 py-0.5 text-xs" onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
