'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MapContainer } from './MapContainer';
import { Badge } from '@/components/ui/Card';
import { StarRating } from '@/components/ui/StarRating';
import { IconChevronRight, IconPin } from '@/components/ui/Icons';
import { placeAverageRating } from '@/components/places/PlaceCard';
import { PLACE_CATEGORIES, categoryMeta } from '@/lib/constants';
import { formatDistance, haversineDistance } from '@/lib/route/geo';
import { formatOpeningHours } from '@/lib/utils/hours';
import { hasLocation } from '@/lib/utils/place';
import { cn } from '@/lib/utils/cn';
import type { PlaceWithExtras } from '@/types/database';

type StatusFilter = 'all' | 'want' | 'visited';

/**
 * 保存したスポットを地図にまとめて出す。
 * ピンをタップすると、そのスポットが何なのかを下のカードに表示する。
 */
export function SpotsMap({ places }: { places: PlaceWithExtras[] }) {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<string | null>(null);
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
        setLocating(false);
      },
      () => {
        setLocationError('現在地を取得できませんでした。位置情報の許可を確認してください。');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  };

  const filtered = useMemo(
    () =>
      places.filter((p) => {
        if (status !== 'all' && p.status !== status) return false;
        if (category && p.category !== category) return false;
        return true;
      }),
    [places, status, category],
  );

  const located = useMemo(() => filtered.filter(hasLocation), [filtered]);

  const markers = useMemo(
    () =>
      located.map((place) => ({
        id: place.id,
        lat: place.lat,
        lng: place.lng,
        label: place.name,
        visited: place.status === 'visited',
      })),
    [located],
  );

  const selected = filtered.find((p) => p.id === selectedId) ?? null;
  const unlocatedCount = filtered.length - located.length;

  return (
    <div className="space-y-3">
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
            onClick={requestLocation}
            className={cn('chip shrink-0', myLocation && 'chip-active')}
            disabled={locating}
          >
            📍 {locating ? '取得中…' : myLocation ? '現在地あり' : '現在地を出す'}
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
      </div>

      <p className="text-sm text-ink-500 dark:text-ink-400">
        地図に{located.length}件
        {unlocatedCount > 0 && <span className="ml-1 text-xs">（場所が未設定のスポットが{unlocatedCount}件）</span>}
      </p>

      {locationError && <p className="text-xs text-red-500">{locationError}</p>}

      <MapContainer
        markers={markers}
        selectedId={selectedId}
        onMarkerClick={setSelectedId}
        showMyLocation={myLocation}
        className="h-[58vh] min-h-[360px] w-full border border-ink-100 dark:border-ink-800"
      />

      {selected ? (
        <SelectedCard place={selected} myLocation={myLocation} />
      ) : (
        <p className="pb-2 text-center text-sm text-ink-500 dark:text-ink-400">
          {markers.length === 0
            ? '地図に出せるスポットがまだありません。'
            : 'ピンをタップすると、そのスポットの情報が出ます'}
        </p>
      )}

      {unlocatedCount > 0 && (
        <p className="pb-2 text-center text-xs text-ink-400">
          場所が未設定のスポットは地図に出ません。詳細画面から地図をタップすると設定できます。
        </p>
      )}
    </div>
  );
}

/** ピンをタップしたときに出る、そのスポットの中身 */
function SelectedCard({
  place,
  myLocation,
}: {
  place: PlaceWithExtras;
  myLocation: { lat: number; lng: number } | null;
}) {
  const meta = categoryMeta(place.category);
  const rating = placeAverageRating(place);
  const hours = formatOpeningHours(place);

  return (
    <Link
      href={`/places/${place.id}`}
      className="card flex animate-fade-up items-center gap-3 p-3 transition hover:shadow-lift"
    >
      <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-sky-gradient text-2xl dark:bg-ink-800">
        {place.photo_url ? (
          // 外部ドメインが多岐にわたるため next/image ではなく img を使う
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span aria-hidden="true">{meta.emoji}</span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-ink-900 dark:text-ink-50">{place.name}</span>
        <span className="block truncate text-xs text-ink-500 dark:text-ink-400">
          {place.address ?? (hasLocation(place) ? `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}` : '場所は未設定')}
        </span>
        {hours && <span className="mt-0.5 block truncate text-xs text-ink-500 dark:text-ink-400">{hours}</span>}
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge tone="brand">
            {meta.emoji} {meta.label}
          </Badge>
          <Badge tone={place.status === 'visited' ? 'accent' : 'neutral'}>
            {place.status === 'visited' ? '✅ 行った！' : '✨ 行きたい'}
          </Badge>
          {myLocation && hasLocation(place) && (
            <Badge tone="muted">
              <IconPin width={12} height={12} className="mr-0.5 inline" />
              {formatDistance(haversineDistance(myLocation, { lat: place.lat, lng: place.lng }))}
            </Badge>
          )}
          {rating !== null && <StarRating value={rating} readOnly size={14} />}
        </span>
        {place.memo && (
          <span className="mt-1 block truncate text-xs text-ink-500 dark:text-ink-400">{place.memo}</span>
        )}
      </span>

      <IconChevronRight className="shrink-0 text-ink-400" />
    </Link>
  );
}
