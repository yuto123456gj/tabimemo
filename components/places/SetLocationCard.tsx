'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MapContainer } from '@/components/map/MapContainer';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { IconMap, IconSearch } from '@/components/ui/Icons';
import { updatePlace } from '@/lib/actions/places';
import type { PlaceCandidate } from '@/lib/providers/places/types';

/**
 * 場所がまだ決まっていないスポットに、あとから位置を設定するカード。
 * 「名前で探す」と「地図をタップ」の2通りから選べる。
 */
export function SetLocationCard({ placeId, placeName }: { placeId: string; placeName: string }) {
  const router = useRouter();
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [candidates, setCandidates] = useState<PlaceCandidate[] | null>(null);
  const [query, setQuery] = useState(placeName);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const search = async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setCandidates((json.candidates ?? []).slice(0, 5));
    } catch {
      setError('検索に失敗しました。');
    } finally {
      setSearching(false);
    }
  };

  const save = (lat: number, lng: number, address?: string | null) => {
    setError(null);
    startTransition(async () => {
      const result = await updatePlace(placeId, { lat, lng, ...(address ? { address } : {}) });
      if (!result.ok) {
        setError(result.error ?? '保存できませんでした。');
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="card space-y-3 border-2 border-dashed border-brand-300 p-4 dark:border-brand-700">
      <div className="flex items-center gap-2">
        <IconMap className="text-brand-500" />
        <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">場所がまだ決まっていません</h3>
      </div>
      <p className="text-xs leading-relaxed text-ink-500 dark:text-ink-400">
        場所を決めると、地図に表示され、しおりのルート計算にも使えるようになります。
      </p>

      {error && <Notice tone="error">{error}</Notice>}

      {/* 名前で探す */}
      <div>
        <label className="label" htmlFor={`relocate-${placeId}`}>
          もう一度、名前で探す
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <IconSearch
              width={18}
              height={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              id={`relocate-${placeId}`}
              className="input pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="店名 + エリア"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void search();
                }
              }}
            />
          </div>
          <Button variant="outline" onClick={search} disabled={searching}>
            {searching ? <Spinner /> : '検索'}
          </Button>
        </div>
      </div>

      {candidates && candidates.length > 0 && (
        <ul className="space-y-1.5">
          {candidates.map((c, i) => (
            <li key={`${c.externalId ?? c.name}-${i}`}>
              <button
                type="button"
                disabled={pending}
                onClick={() => save(c.lat, c.lng, c.address)}
                className="w-full rounded-xl border border-ink-200 px-3 py-2 text-left text-sm transition hover:border-brand-300 dark:border-ink-700"
              >
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block truncate text-xs text-ink-400">{c.address ?? '住所不明'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {candidates && candidates.length === 0 && (
        <p className="text-xs text-ink-500 dark:text-ink-400">
          見つかりませんでした。下の地図で直接指定してください。
        </p>
      )}

      {/* 地図で指定 */}
      <div>
        <p className="label">地図をタップして指定する</p>
        <MapContainer
          markers={picked ? [{ id: 'picked', lat: picked.lat, lng: picked.lng, label: placeName }] : []}
          onMapClick={setPicked}
          className="h-56 w-full border border-ink-100 dark:border-ink-800"
        />
        {picked && (
          <Button className="mt-3 w-full" disabled={pending} onClick={() => save(picked.lat, picked.lng)}>
            {pending ? <Spinner /> : `この場所に決定（${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)}）`}
          </Button>
        )}
      </div>
    </div>
  );
}
