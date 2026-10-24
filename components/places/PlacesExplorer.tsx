'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MapContainer } from '@/components/map/MapContainer';
import { PlaceCard, placeAverageRating, placeWantAgain } from './PlaceCard';
import { Badge } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconChevronRight, IconList, IconMap, IconPin, IconSearch } from '@/components/ui/Icons';
import { PLACE_CATEGORIES, categoryMeta } from '@/lib/constants';
import { haversineDistance, formatDistance } from '@/lib/route/geo';
import { cn } from '@/lib/utils/cn';
import type { PlaceList, PlaceWithExtras, Tag } from '@/types/database';

type View = 'list' | 'map';
type Sort = 'created' | 'near' | 'planned' | 'rating';
type StatusFilter = 'all' | 'want' | 'visited';

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: 'created', label: '追加が新しい順' },
  { value: 'near', label: '現在地から近い順' },
  { value: 'planned', label: '予定日が近い順' },
  { value: 'rating', label: '評価が高い順' },
];

export function PlacesExplorer({
  places,
  tags,
  lists,
}: {
  places: PlaceWithExtras[];
  tags: Tag[];
  lists: PlaceList[];
}) {
  const [view, setView] = useState<View>('list');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<string | null>(null);
  const [tagId, setTagId] = useState<string | null>(null);
  const [listId, setListId] = useState<string | null>(null);
  const [wantAgainOnly, setWantAgainOnly] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState<Sort>('created');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('この端末では現在地を取得できません。');
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSort('near');
        setLocating(false);
      },
      () => {
        setLocationError('現在地を取得できませんでした。位置情報の許可を確認してください。');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  };

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();

    const result = places.filter((p) => {
      if (status !== 'all' && p.status !== status) return false;
      if (category && p.category !== category) return false;
      if (tagId && !(p.place_tags ?? []).some((pt) => pt.tag_id === tagId)) return false;
      if (listId && !(p.list_places ?? []).some((lp) => lp.list_id === listId)) return false;
      if (wantAgainOnly && !placeWantAgain(p)) return false;
      if (kw) {
        const haystack = [p.name, p.address, p.memo].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });

    const withDistance = result.map((p) => ({
      place: p,
      distance: myLocation ? haversineDistance(myLocation, { lat: p.lat, lng: p.lng }) : null,
    }));

    switch (sort) {
      case 'near':
        withDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        break;
      case 'planned':
        withDistance.sort((a, b) => {
          const av = a.place.planned_date ?? '9999-12-31';
          const bv = b.place.planned_date ?? '9999-12-31';
          return av.localeCompare(bv);
        });
        break;
      case 'rating':
        withDistance.sort((a, b) => (placeAverageRating(b.place) ?? -1) - (placeAverageRating(a.place) ?? -1));
        break;
      default:
        withDistance.sort((a, b) => b.place.created_at.localeCompare(a.place.created_at));
    }

    return withDistance;
  }, [places, status, category, tagId, listId, wantAgainOnly, keyword, sort, myLocation]);

  const markers = useMemo(
    () =>
      filtered.map(({ place }) => ({
        id: place.id,
        lat: place.lat,
        lng: place.lng,
        label: place.name,
        visited: place.status === 'visited',
      })),
    [filtered],
  );

  const selected = filtered.find((f) => f.place.id === selectedId)?.place ?? null;
  const activeFilterCount =
    (status !== 'all' ? 1 : 0) + (category ? 1 : 0) + (tagId ? 1 : 0) + (listId ? 1 : 0) + (wantAgainOnly ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* 検索 + 表示切替 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <IconSearch
            width={18}
            height={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="名前・住所・メモで探す"
            className="input pl-10"
            aria-label="スポットを検索"
          />
        </div>
        <div className="flex shrink-0 rounded-pill border border-ink-200 p-0.5 dark:border-ink-700">
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn(
              'flex items-center gap-1 rounded-pill px-3 py-1.5 text-sm font-medium transition',
              view === 'list' ? 'bg-brand-500 text-white' : 'text-ink-500 dark:text-ink-300',
            )}
            aria-pressed={view === 'list'}
          >
            <IconList width={16} height={16} />
            <span className="hidden sm:inline">リスト</span>
          </button>
          <button
            type="button"
            onClick={() => setView('map')}
            className={cn(
              'flex items-center gap-1 rounded-pill px-3 py-1.5 text-sm font-medium transition',
              view === 'map' ? 'bg-brand-500 text-white' : 'text-ink-500 dark:text-ink-300',
            )}
            aria-pressed={view === 'map'}
          >
            <IconMap width={16} height={16} />
            <span className="hidden sm:inline">地図</span>
          </button>
        </div>
      </div>

      {/* 絞り込み */}
      <div className="-mx-4 space-y-2 overflow-hidden px-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'want', 'visited'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn('chip shrink-0', status === s && 'chip-active')}
            >
              {s === 'all' ? 'すべて' : s === 'want' ? '✨ 行きたい' : '✅ 行った！'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setWantAgainOnly((v) => !v)}
            className={cn('chip shrink-0', wantAgainOnly && 'chip-active')}
          >
            💖 また行きたい
          </button>
          <button
            type="button"
            onClick={requestLocation}
            className={cn('chip shrink-0', myLocation && 'chip-active')}
            disabled={locating}
          >
            📍 {locating ? '取得中…' : myLocation ? '現在地あり' : '現在地を使う'}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn('chip shrink-0', !category && 'chip-active')}
          >
            全カテゴリ
          </button>
          {PLACE_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(category === c.value ? null : c.value)}
              className={cn('chip shrink-0', category === c.value && 'chip-active')}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {(tags.length > 0 || lists.length > 0) && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {lists.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setListId(listId === l.id ? null : l.id)}
                className={cn('chip shrink-0', listId === l.id && 'chip-active')}
              >
                {l.emoji ?? '📁'} {l.name}
              </button>
            ))}
            {tags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTagId(tagId === t.id ? null : t.id)}
                className={cn('chip shrink-0', tagId === t.id && 'chip-active')}
              >
                #{t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 件数 + 並び替え */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {filtered.length}件
          {activeFilterCount > 0 && <span className="ml-1 text-xs">（絞り込み{activeFilterCount}件）</span>}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only">並び替え</span>
          <select
            value={sort}
            onChange={(e) => {
              const next = e.target.value as Sort;
              setSort(next);
              if (next === 'near' && !myLocation) requestLocation();
            }}
            className="rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-sm dark:border-ink-700 dark:bg-ink-900"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {locationError && <p className="text-xs text-red-500">{locationError}</p>}

      {/* 本体 */}
      {filtered.length === 0 ? (
        places.length === 0 ? (
          <EmptyState
            art="pin"
            title="まだスポットがありません"
            description="行きたいお店や景色を保存すると、ここに並びます。気になった投稿のリンクを貼って名前を書くだけでも追加できます。"
            action={
              <ButtonLink href="/places/new">
                <IconPin width={18} height={18} />
                スポットを追加
              </ButtonLink>
            }
          />
        ) : (
          <EmptyState
            art="search"
            title="条件に合うスポットがありません"
            description="絞り込みを外すか、別のキーワードで探してみてください。"
          />
        )
      ) : view === 'list' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(({ place, distance }) => (
            <PlaceCard key={place.id} place={place} distanceMeters={distance} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <MapContainer
            markers={markers}
            selectedId={selectedId}
            onMarkerClick={setSelectedId}
            showMyLocation={myLocation}
            className="h-[52vh] min-h-[320px] w-full border border-ink-100 dark:border-ink-800"
          />
          {selected ? (
            <Link
              href={`/places/${selected.id}`}
              className="card flex animate-fade-up items-center gap-3 p-3 transition hover:shadow-lift"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky-gradient text-xl dark:bg-ink-800">
                {categoryMeta(selected.category).emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-ink-900 dark:text-ink-50">{selected.name}</span>
                <span className="block truncate text-xs text-ink-500 dark:text-ink-400">
                  {selected.address ?? `${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}`}
                </span>
                <span className="mt-1 flex items-center gap-1.5">
                  <Badge tone="brand">{categoryMeta(selected.category).label}</Badge>
                  {myLocation && (
                    <Badge tone="neutral">
                      {formatDistance(haversineDistance(myLocation, { lat: selected.lat, lng: selected.lng }))}
                    </Badge>
                  )}
                </span>
              </span>
              <IconChevronRight className="shrink-0 text-ink-400" />
            </Link>
          ) : (
            <p className="text-center text-sm text-ink-500 dark:text-ink-400">
              ピンをタップすると詳細が表示されます
            </p>
          )}
        </div>
      )}
    </div>
  );
}
