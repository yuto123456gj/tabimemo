'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { IconTrash } from '@/components/ui/Icons';
import { deletePlace, setPlaceStatus, togglePlaceInList, updatePlace } from '@/lib/actions/places';
import { cn } from '@/lib/utils/cn';
import type { PlaceList, PlaceWithExtras } from '@/types/database';

export function PlaceActions({
  place,
  lists,
  memberListIds,
}: {
  place: PlaceWithExtras;
  lists: PlaceList[];
  memberListIds: string[];
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memo, setMemo] = useState(place.memo ?? '');
  const [plannedDate, setPlannedDate] = useState(place.planned_date ?? '');
  const [savedMemo, setSavedMemo] = useState(false);
  const [pending, startTransition] = useTransition();

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? '更新できませんでした。');
      else router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex flex-wrap gap-2">
        <Button
          variant={place.status === 'want' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => act(() => setPlaceStatus(place.id, 'want'))}
          disabled={pending}
        >
          ✨ 行きたい
        </Button>
        <Button
          variant={place.status === 'visited' ? 'accent' : 'outline'}
          size="sm"
          onClick={() => act(() => setPlaceStatus(place.id, 'visited'))}
          disabled={pending}
        >
          ✅ 行った！
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="place-planned">
            予定日
          </label>
          <input
            id="place-planned"
            type="date"
            className="input"
            value={plannedDate}
            onChange={(e) => {
              setPlannedDate(e.target.value);
              act(() => updatePlace(place.id, { planned_date: e.target.value || null }));
            }}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="place-memo">
          メモ
        </label>
        <textarea
          id="place-memo"
          className="input min-h-[80px] resize-y"
          value={memo}
          onChange={(e) => {
            setMemo(e.target.value);
            setSavedMemo(false);
          }}
          onBlur={() => {
            if (memo === (place.memo ?? '')) return;
            act(async () => {
              const r = await updatePlace(place.id, { memo: memo.trim() || null });
              if (r.ok) setSavedMemo(true);
              return r;
            });
          }}
          placeholder="営業時間、おすすめメニュー、行くときの注意など"
        />
        <p className="mt-1 text-xs text-ink-400">{savedMemo ? '保存しました' : '入力後、フォーカスを外すと保存されます'}</p>
      </div>

      {lists.length > 0 && (
        <div>
          <span className="label">リスト</span>
          <div className="flex flex-wrap gap-2">
            {lists.map((l) => {
              const on = memberListIds.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  disabled={pending}
                  onClick={() => act(() => togglePlaceInList(l.id, place.id, !on))}
                  className={cn('chip', on && 'chip-active')}
                >
                  {l.emoji ?? '📁'} {l.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-ink-100 pt-3 dark:border-ink-800">
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-600 dark:text-ink-300">本当に削除しますか？</span>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deletePlace(place.id);
                  if (!result.ok) {
                    setError(result.error ?? '削除できませんでした。');
                    return;
                  }
                  router.push('/places');
                })
              }
            >
              {pending ? <Spinner /> : '削除する'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
              やめる
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} className="text-red-500">
            <IconTrash width={16} height={16} />
            このスポットを削除
          </Button>
        )}
      </div>
    </div>
  );
}
