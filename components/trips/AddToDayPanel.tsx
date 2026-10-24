'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { IconPlus, IconSearch, IconSparkles } from '@/components/ui/Icons';
import { categoryMeta } from '@/lib/constants';
import { formatDistance, haversineDistance } from '@/lib/route/geo';
import { hasLocation } from '@/lib/utils/place';
import { cn } from '@/lib/utils/cn';
import type { PlaceWithExtras } from '@/types/database';

/** 保存済みスポットから日程に追加するパネル */
export function AddToDayPanel({
  places,
  usedPlaceIds,
  area,
  dayLabel,
  onAddPlaces,
  onAddCustom,
  pending,
}: {
  places: PlaceWithExtras[];
  usedPlaceIds: string[];
  area: { lat: number; lng: number } | null;
  dayLabel: string;
  onAddPlaces: (placeIds: string[]) => void;
  onAddCustom: (title: string) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState('');

  const { recommended, others } = useMemo(() => {
    const available = places.filter((p) => !usedPlaceIds.includes(p.id));
    const kw = keyword.trim().toLowerCase();
    const filtered = kw
      ? available.filter((p) =>
          [p.name, p.address, p.memo].filter(Boolean).join(' ').toLowerCase().includes(kw),
        )
      : available;

    if (!area) {
      return { recommended: [], others: filtered };
    }

    // 旅行先エリアの近く（30km以内）をおすすめ候補として上に出す
    const withDistance = filtered.map((p) => ({
      place: p,
      // 場所が未設定のスポットは「遠いもの」として扱い、おすすめ候補には出さない
      distance: hasLocation(p) ? haversineDistance(area, { lat: p.lat, lng: p.lng }) : Number.POSITIVE_INFINITY,
    }));
    const near = withDistance
      .filter((w) => w.distance <= 30000)
      .sort((a, b) => a.distance - b.distance);
    const far = withDistance
      .filter((w) => w.distance > 30000)
      .sort((a, b) => a.distance - b.distance)
      .map((w) => w.place);

    return { recommended: near, others: far };
  }, [places, usedPlaceIds, keyword, area]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const add = () => {
    if (selected.length === 0) return;
    onAddPlaces(selected);
    setSelected([]);
    setKeyword('');
  };

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <IconPlus width={18} height={18} />
        {dayLabel}にスポットを追加
      </Button>
    );
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">{dayLabel}に追加</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-ink-400 underline">
          閉じる
        </button>
      </div>

      <div className="relative">
        <IconSearch
          width={18}
          height={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
        />
        <input
          className="input pl-10"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="保存済みスポットを絞り込む"
        />
      </div>

      {places.length === 0 && (
        <Notice tone="info">
          保存済みのスポットがまだありません。「スポット」タブから追加すると、ここから選べるようになります。
        </Notice>
      )}

      <div className="max-h-72 space-y-2 overflow-y-auto">
        {recommended.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-300">
              <IconSparkles width={14} height={14} />
              旅行先の近くにある保存済みスポット
            </p>
            <ul className="space-y-1.5">
              {recommended.map(({ place, distance }) => (
                <li key={place.id}>
                  <PlaceOption
                    place={place}
                    distance={distance}
                    checked={selected.includes(place.id)}
                    onToggle={() => toggle(place.id)}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {others.length > 0 && (
          <div>
            {recommended.length > 0 && (
              <p className="mb-1.5 mt-2 text-xs font-bold text-ink-400">そのほかの保存済みスポット</p>
            )}
            <ul className="space-y-1.5">
              {others.map((place) => (
                <li key={place.id}>
                  <PlaceOption
                    place={place}
                    distance={area && hasLocation(place) ? haversineDistance(area, { lat: place.lat, lng: place.lng }) : null}
                    checked={selected.includes(place.id)}
                    onToggle={() => toggle(place.id)}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommended.length === 0 && others.length === 0 && places.length > 0 && (
          <p className="py-4 text-center text-sm text-ink-400">追加できるスポットがありません</p>
        )}
      </div>

      <Button onClick={add} disabled={pending || selected.length === 0} className="w-full">
        {pending ? <Spinner /> : `${selected.length}件を${dayLabel}に追加`}
      </Button>

      <div className="border-t border-ink-100 pt-3 dark:border-ink-800">
        <label className="label" htmlFor="custom-item">
          宿泊先・集合場所などを追加（スポット以外）
        </label>
        <div className="flex gap-2">
          <input
            id="custom-item"
            className="input"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="例: 京都駅 中央改札に集合"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customTitle.trim()) {
                e.preventDefault();
                onAddCustom(customTitle.trim());
                setCustomTitle('');
              }
            }}
          />
          <Button
            variant="outline"
            disabled={pending || !customTitle.trim()}
            onClick={() => {
              onAddCustom(customTitle.trim());
              setCustomTitle('');
            }}
          >
            追加
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlaceOption({
  place,
  distance,
  checked,
  onToggle,
}: {
  place: PlaceWithExtras;
  distance: number | null;
  checked: boolean;
  onToggle: () => void;
}) {
  const meta = categoryMeta(place.category);
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition',
        checked ? 'bg-brand-50 dark:bg-brand-900/30' : 'hover:bg-ink-50 dark:hover:bg-ink-800',
      )}
    >
      <span
        className={cn(
          'grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px] font-bold',
          checked ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-300 text-transparent dark:border-ink-600',
        )}
        aria-hidden="true"
      >
        ✓
      </span>
      <span className="shrink-0" aria-hidden="true">
        {meta.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink-900 dark:text-ink-50">{place.name}</span>
        <span className="block truncate text-[11px] text-ink-500 dark:text-ink-400">
          {place.address ?? ''}
          {distance !== null && ` ・ ${formatDistance(distance)}`}
        </span>
      </span>
      {place.status === 'visited' && <span className="shrink-0 text-[10px] text-accent-600">行った</span>}
    </button>
  );
}
