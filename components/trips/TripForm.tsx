'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { IconSearch } from '@/components/ui/Icons';
import { createTrip } from '@/lib/actions/trips';
import { toDateInputValue } from '@/lib/utils/date';
import type { PlaceCandidate } from '@/lib/providers/places/types';

/** 旅行の新規作成フォーム */
export function TripForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const today = toDateInputValue(new Date());

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [coverUrl, setCoverUrl] = useState('');
  const [areaQuery, setAreaQuery] = useState('');
  const [area, setArea] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [areaCandidates, setAreaCandidates] = useState<PlaceCandidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const searchArea = async () => {
    const q = areaQuery.trim();
    if (q.length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setAreaCandidates((json.candidates ?? []).slice(0, 4));
    } catch {
      setError('エリアの検索に失敗しました。');
    } finally {
      setSearching(false);
    }
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createTrip({
        groupId,
        title,
        startDate,
        endDate,
        coverUrl: coverUrl.trim() || null,
        areaLat: area?.lat ?? null,
        areaLng: area?.lng ?? null,
      });
      if (!result.ok) {
        setError(result.error ?? '作成できませんでした。');
        return;
      }
      router.push(`/trips/${result.data}`);
    });
  };

  return (
    <div className="space-y-4">
      {error && <Notice tone="error">{error}</Notice>}

      <div>
        <label className="label" htmlFor="trip-title">
          タイトル
        </label>
        <input
          id="trip-title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="京都ぶらぶら旅"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="trip-start">
            開始日
          </label>
          <input
            id="trip-start"
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (endDate < e.target.value) setEndDate(e.target.value);
            }}
          />
        </div>
        <div>
          <label className="label" htmlFor="trip-end">
            終了日
          </label>
          <input
            id="trip-end"
            type="date"
            className="input"
            min={startDate}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="trip-area">
          旅行先エリア（任意）
        </label>
        <p className="mb-1.5 text-xs text-ink-400">
          設定すると、しおり編集時に「近くにある保存済みスポット」をおすすめ候補として上に出します。
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <IconSearch
              width={18}
              height={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              id="trip-area"
              className="input pl-10"
              value={areaQuery}
              onChange={(e) => setAreaQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void searchArea();
                }
              }}
              placeholder="京都市"
            />
          </div>
          <Button variant="outline" onClick={searchArea} disabled={searching}>
            {searching ? <Spinner /> : '検索'}
          </Button>
        </div>

        {area && (
          <p className="mt-2 text-sm text-accent-600 dark:text-accent-300">
            エリア: {area.name}
            <button type="button" className="ml-2 text-xs underline" onClick={() => setArea(null)}>
              解除
            </button>
          </p>
        )}

        {areaCandidates && areaCandidates.length > 0 && !area && (
          <ul className="mt-2 space-y-1.5">
            {areaCandidates.map((c, i) => (
              <li key={`${c.name}-${i}`}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-ink-200 px-3 py-2 text-left text-sm transition hover:border-brand-300 dark:border-ink-700"
                  onClick={() => {
                    setArea({ name: c.name, lat: c.lat, lng: c.lng });
                    setAreaCandidates(null);
                  }}
                >
                  <span className="block font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-ink-400">{c.address}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="label" htmlFor="trip-cover">
          カバー画像URL（任意）
        </label>
        <input
          id="trip-cover"
          type="url"
          className="input"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <Button onClick={submit} disabled={pending || !title.trim()} size="lg" className="w-full">
        {pending ? <Spinner /> : 'しおりを作る'}
      </Button>
    </div>
  );
}
