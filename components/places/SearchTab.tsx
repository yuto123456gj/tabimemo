'use client';

import { useState } from 'react';
import { MapContainer } from '@/components/map/MapContainer';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconSearch } from '@/components/ui/Icons';
import { categoryMeta } from '@/lib/constants';
import { SavePlaceForm, type DraftPlace } from './SavePlaceForm';
import type { PlaceCandidate } from '@/lib/providers/places/types';
import type { PlaceList } from '@/types/database';

export function SearchTab({
  groupId,
  lists,
  initialQuery = '',
}: {
  groupId: string;
  lists: PlaceList[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [candidates, setCandidates] = useState<PlaceCandidate[] | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<DraftPlace | null>(null);
  const [manual, setManual] = useState<{ lat: number; lng: number } | null>(null);

  const search = async () => {
    const q = query.trim();
    if (q.length < 2) {
      setError('2文字以上で検索してください。');
      return;
    }
    setLoading(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? '検索に失敗しました。');
        setCandidates([]);
        return;
      }
      setCandidates(json.candidates ?? []);
      setProvider(json.provider ?? null);
      if (json.fallbackReason) setNote(json.fallbackReason);
    } catch {
      setError('検索に失敗しました。通信状況を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  if (draft) {
    return <SavePlaceForm draft={draft} groupId={groupId} lists={lists} onCancel={() => setDraft(null)} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="place-search">
          店名・地名で検索
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <IconSearch
              width={18}
              height={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              id="place-search"
              className="input pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void search();
                }
              }}
              placeholder="例: 喫茶ソワレ 京都"
            />
          </div>
          <Button onClick={search} disabled={loading}>
            {loading ? <Spinner /> : '検索'}
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-ink-400">
          お店の名前だけだと見つからないことがあります。「店名 + エリア」で探すと当たりやすいです。
        </p>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {note && <Notice tone="info">{note}</Notice>}

      {candidates && candidates.length > 0 && (
        <ul className="space-y-2">
          {provider && (
            <li className="text-xs text-ink-400">
              検索元: {provider === 'google' ? 'Google Places' : 'OpenStreetMap'}
            </li>
          )}
          {candidates.map((c, i) => (
            <li key={`${c.externalId ?? c.name}-${i}`}>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    name: c.name,
                    address: c.address,
                    lat: c.lat,
                    lng: c.lng,
                    category: c.category,
                    photoUrl: c.photoUrl,
                    externalId: c.externalId,
                  })
                }
                className="card flex w-full items-center gap-3 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-gradient text-lg dark:bg-ink-800">
                  {categoryMeta(c.category).emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-ink-900 dark:text-ink-50">{c.name}</span>
                  <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{c.address ?? '住所不明'}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {candidates && candidates.length === 0 && !error && (
        <div className="space-y-3">
          <EmptyState
            art="search"
            title="見つかりませんでした"
            description="地図に載っていないお店もあります。名前だけで先に登録して、場所はあとから決められます。"
          />

          {/* 名前だけで先に登録する */}
          <Button
            className="w-full"
            onClick={() =>
              setDraft({
                name: query.trim(),
                address: null,
                lat: null,
                lng: null,
                category: null,
              })
            }
          >
            「{query.trim()}」を名前だけで登録する
          </Button>
          <p className="-mt-1 text-center text-xs text-ink-400">
            場所は、あとでスポットの詳細画面から地図をタップして決められます
          </p>

          <div className="flex items-center gap-3 pt-1 text-xs text-ink-400">
            <span className="h-px flex-1 bg-ink-200 dark:bg-ink-700" />
            または、いま地図で指定する
            <span className="h-px flex-1 bg-ink-200 dark:bg-ink-700" />
          </div>

          <div>
            <MapContainer
              markers={manual ? [{ id: 'manual', lat: manual.lat, lng: manual.lng }] : []}
              onMapClick={setManual}
              className="h-56 w-full border border-ink-100 dark:border-ink-800"
            />
            {manual && (
              <Button
                className="mt-3 w-full"
                onClick={() =>
                  setDraft({
                    name: query.trim() || '名前のないスポット',
                    address: null,
                    lat: manual.lat,
                    lng: manual.lng,
                    category: null,
                  })
                }
              >
                この場所で登録する（{manual.lat.toFixed(4)}, {manual.lng.toFixed(4)}）
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
