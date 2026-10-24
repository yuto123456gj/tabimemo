'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MapContainer } from '@/components/map/MapContainer';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { PLACE_CATEGORIES } from '@/lib/constants';
import { createPlace } from '@/lib/actions/places';
import { hasLocation } from '@/lib/utils/place';
import { cn } from '@/lib/utils/cn';
import type { PlaceList } from '@/types/database';

export interface DraftPlace {
  name: string;
  address: string | null;
  /** 場所が未定のまま登録する場合は null（あとで詳細画面から設定できる） */
  lat: number | null;
  lng: number | null;
  category: string | null;
  photoUrl?: string | null;
  externalId?: string | null;
  sourceUrl?: string | null;
  memo?: string | null;
  tags?: string[];
}

/** 候補を選んだあとの保存フォーム（メモ・予定日・タグ・リスト） */
export function SavePlaceForm({
  draft,
  groupId,
  lists,
  onCancel,
}: {
  draft: DraftPlace;
  groupId: string;
  lists: PlaceList[];
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(draft.name);
  const [category, setCategory] = useState(draft.category ?? 'other');
  const [memo, setMemo] = useState(draft.memo ?? '');
  const [plannedDate, setPlannedDate] = useState('');
  const [sourceUrl, setSourceUrl] = useState(draft.sourceUrl ?? '');
  const [tagsText, setTagsText] = useState((draft.tags ?? []).join(' '));
  const [listIds, setListIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await createPlace({
        groupId,
        name,
        address: draft.address,
        lat: draft.lat,
        lng: draft.lng,
        category,
        photoUrl: draft.photoUrl ?? null,
        sourceUrl: sourceUrl.trim() || null,
        memo: memo.trim() || null,
        plannedDate: plannedDate || null,
        externalId: draft.externalId ?? null,
        tags: tagsText
          .split(/[\s,、#＃]+/)
          .map((t) => t.trim())
          .filter(Boolean),
        listIds,
      });

      if (!result.ok) {
        setError(result.error ?? '保存できませんでした。');
        return;
      }
      router.push(`/places/${result.data}`);
    });
  };

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden p-0">
        {hasLocation(draft) ? (
          <MapContainer
            markers={[{ id: 'draft', lat: draft.lat, lng: draft.lng, label: name }]}
            className="h-40 w-full"
            interactive={false}
          />
        ) : (
          <div className="flex h-24 items-center justify-center gap-2 bg-sky-gradient px-4 text-center text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            場所は未設定で保存します。あとで詳細画面から地図でピンを打てます。
          </div>
        )}
        <div className="p-4">
          <p className="text-sm font-bold text-ink-900 dark:text-ink-50">{draft.name}</p>
          {draft.address && <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{draft.address}</p>}
          {hasLocation(draft) && (
            <p className="mt-1 text-[11px] text-ink-400">
              {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
            </p>
          )}
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div>
        <label className="label" htmlFor="place-name">
          スポット名
        </label>
        <input id="place-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <span className="label">カテゴリ</span>
        <div className="flex flex-wrap gap-2">
          {PLACE_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={cn('chip', category === c.value && 'chip-active')}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="planned-date">
            予定日（任意）
          </label>
          <input
            id="planned-date"
            type="date"
            className="input"
            value={plannedDate}
            onChange={(e) => setPlannedDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="tags">
            タグ（スペース区切り・任意）
          </label>
          <input
            id="tags"
            className="input"
            placeholder="デート 雨の日でもOK"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="memo">
          メモ（任意）
        </label>
        <textarea
          id="memo"
          className="input min-h-[88px] resize-y"
          placeholder="名物はプリン。11時までに行くと空いてるらしい"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="source-url">
          元の投稿URL（任意）
        </label>
        <input
          id="source-url"
          type="url"
          className="input"
          placeholder="https://www.instagram.com/p/..."
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />
      </div>

      {lists.length > 0 && (
        <div>
          <span className="label">リストに入れる（任意・複数可）</span>
          <div className="flex flex-wrap gap-2">
            {lists.map((l) => {
              const on = listIds.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setListIds((prev) => (on ? prev.filter((id) => id !== l.id) : [...prev, l.id]))}
                  className={cn('chip', on && 'chip-active')}
                >
                  {l.emoji ?? '📁'} {l.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button onClick={save} disabled={pending || !name.trim()} className="flex-1">
          {pending ? <Spinner /> : 'このスポットを保存'}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            選び直す
          </Button>
        )}
      </div>
    </div>
  );
}
