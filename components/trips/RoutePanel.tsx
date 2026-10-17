'use client';

import { useMemo, useState } from 'react';
import { MapContainer } from '@/components/map/MapContainer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Card';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { IconMap, IconRoute } from '@/components/ui/Icons';
import { ROUTABLE_MODES, transportMeta } from '@/lib/constants';
import { formatDistance, formatDuration } from '@/lib/route/geo';
import { TRANSPORT_TO_GOOGLE_MODE, googleMapsDirectionsUrl } from '@/lib/route/googleMaps';
import { cn } from '@/lib/utils/cn';
import type { TripItemWithPlace } from '@/types/database';

export interface RouteLegInfo {
  fromIndex: number;
  toIndex: number;
  distance: number;
  duration: number;
}

interface MatrixResponse {
  order: number[];
  orderedIds: string[];
  legs: RouteLegInfo[];
  totalDistance: number;
  totalDuration: number;
  originalDistance: number;
  originalDuration: number;
  improvedBy: number;
  source: 'osrm' | 'haversine';
  note?: string;
  error?: string;
}

/** 座標を持つ項目だけがルート計算の対象になる */
function routableItems(items: TripItemWithPlace[]) {
  return items.filter((i) => i.places && Number.isFinite(i.places.lat) && Number.isFinite(i.places.lng));
}

export function RoutePanel({
  items,
  dayLabel,
  onApply,
  onRouteComputed,
  pending,
}: {
  items: TripItemWithPlace[];
  dayLabel: string;
  onApply: (orderedIds: string[]) => void;
  onRouteComputed: (orderedIds: string[], legs: RouteLegInfo[]) => void;
  pending: boolean;
}) {
  const [mode, setMode] = useState<(typeof ROUTABLE_MODES)[number]>('walk');
  const [fixStart, setFixStart] = useState(true);
  const [fixEnd, setFixEnd] = useState(false);
  const [startId, setStartId] = useState<string | null>(null);
  const [endId, setEndId] = useState<string | null>(null);
  const [preview, setPreview] = useState<MatrixResponse | null>(null);
  const [current, setCurrent] = useState<MatrixResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const targets = useMemo(() => routableItems(items), [items]);

  const effectiveStartId = startId ?? targets[0]?.id ?? null;
  const effectiveEndId = endId ?? targets[targets.length - 1]?.id ?? null;

  /** プレビュー中はその順番、そうでなければ現在の順番で地図を描く */
  const displayed = useMemo(() => {
    if (!preview) return targets;
    const byId = new Map(targets.map((i) => [i.id, i]));
    return preview.orderedIds.map((id) => byId.get(id)).filter((i): i is TripItemWithPlace => Boolean(i));
  }, [preview, targets]);

  const markers = displayed.map((item, index) => ({
    id: item.id,
    lat: item.places!.lat,
    lng: item.places!.lng,
    label: item.places!.name,
    order: index + 1,
  }));

  const routeLine = displayed.map((item) => ({ lat: item.places!.lat, lng: item.places!.lng }));

  const googleUrl = googleMapsDirectionsUrl(
    displayed.map((item) => ({ lat: item.places!.lat, lng: item.places!.lng, name: item.places!.name })),
    TRANSPORT_TO_GOOGLE_MODE[mode] ?? 'walking',
  );

  const summary = preview ?? current;

  const optimize = async () => {
    if (targets.length < 2) {
      setError('並べ替えるには、座標を持つスポットが2件以上必要です。');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const points = targets.map((item) => ({
        id: item.id,
        lat: item.places!.lat,
        lng: item.places!.lng,
        name: item.places!.name,
      }));

      const startIndex = fixStart ? points.findIndex((p) => p.id === effectiveStartId) : null;
      const endIndex = fixEnd ? points.findIndex((p) => p.id === effectiveEndId) : null;

      const res = await fetch('/api/route/matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points,
          mode,
          startIndex: startIndex !== null && startIndex >= 0 ? startIndex : null,
          endIndex: endIndex !== null && endIndex >= 0 ? endIndex : null,
          metric: 'distance',
        }),
      });

      const json = (await res.json()) as MatrixResponse;
      if (!res.ok) {
        setError(json.error ?? 'ルートを計算できませんでした。');
        return;
      }

      const sameOrder = json.orderedIds.every((id, i) => targets[i]?.id === id);
      if (sameOrder) {
        // すでに最短だった場合はプレビューを出さず、距離だけ表示する
        setCurrent(json);
        setPreview(null);
        onRouteComputed(json.orderedIds, json.legs);
        setError(null);
        return;
      }

      setPreview(json);
    } catch {
      setError('ルートの計算に失敗しました。通信状況を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!preview) return;
    onApply(preview.orderedIds);
    setCurrent(preview);
    onRouteComputed(preview.orderedIds, preview.legs);
    setPreview(null);
  };

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center gap-2">
        <IconRoute className="text-brand-500" />
        <h3 className="flex-1 text-sm font-bold text-ink-900 dark:text-ink-50">ルート</h3>
        {summary && (
          <Badge tone={summary.source === 'osrm' ? 'accent' : 'neutral'}>
            {summary.source === 'osrm' ? '道路距離' : '直線距離'}
          </Badge>
        )}
      </div>

      {targets.length < 2 ? (
        <p className="text-sm text-ink-500 dark:text-ink-400">
          スポットが2件以上になると、{dayLabel}の立ち寄り順を最短ルートに並べ替えられます。
        </p>
      ) : (
        <>
          {/* 設定 */}
          <div className="space-y-2.5">
            <div>
              <span className="label">移動手段</span>
              <div className="flex gap-1.5">
                {ROUTABLE_MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setPreview(null);
                      setCurrent(null);
                    }}
                    className={cn('chip', mode === m && 'chip-active')}
                  >
                    {transportMeta(m).emoji} {transportMeta(m).label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={fixStart}
                    onChange={(e) => setFixStart(e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400"
                  />
                  出発地を固定
                </label>
                {fixStart && (
                  <select
                    value={effectiveStartId ?? ''}
                    onChange={(e) => setStartId(e.target.value)}
                    className="input mt-1.5 py-2 text-sm"
                  >
                    {targets.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.places?.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={fixEnd}
                    onChange={(e) => setFixEnd(e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400"
                  />
                  到着地を固定
                </label>
                {fixEnd && (
                  <select
                    value={effectiveEndId ?? ''}
                    onChange={(e) => setEndId(e.target.value)}
                    className="input mt-1.5 py-2 text-sm"
                  >
                    {targets.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.places?.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <p className="text-[11px] text-ink-400">
              例: ホテル発→ホテル着にしたい時は、出発地と到着地に同じ宿を入れた項目を2つ作ってそれぞれ固定します。
            </p>
          </div>

          {error && <Notice tone="error">{error}</Notice>}

          <Button onClick={optimize} disabled={loading || pending} className="w-full">
            {loading ? <Spinner /> : <IconRoute width={18} height={18} />}
            最短ルートに並べ替え
          </Button>

          {/* プレビュー */}
          {preview && (
            <div className="animate-fade-up space-y-2 rounded-xl border-2 border-brand-300 bg-brand-50 p-3 dark:border-brand-700 dark:bg-brand-900/30">
              <p className="text-sm font-bold text-brand-700 dark:text-brand-200">
                この順番だと {formatDistance(preview.improvedBy)} 短くなります
              </p>
              <p className="text-xs text-ink-600 dark:text-ink-300">
                いまの順番: {formatDistance(preview.originalDistance)}・約{formatDuration(preview.originalDuration)}
                <br />
                提案: {formatDistance(preview.totalDistance)}・約{formatDuration(preview.totalDuration)}
              </p>
              <ol className="space-y-1">
                {displayed.map((item, index) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="truncate">{item.places?.name}</span>
                  </li>
                ))}
              </ol>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={apply} disabled={pending} className="flex-1">
                  この順番にする
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPreview(null)} disabled={pending}>
                  元に戻す
                </Button>
              </div>
            </div>
          )}

          {!preview && current && (
            <Notice tone="success">
              いまの順番が最短です（{formatDistance(current.totalDistance)}・約
              {formatDuration(current.totalDuration)}）。
              {current.note && <span className="mt-1 block text-xs">{current.note}</span>}
            </Notice>
          )}

          {preview?.note && <p className="text-[11px] text-ink-400">{preview.note}</p>}

          {/* 地図 */}
          <MapContainer
            markers={markers}
            route={routeLine}
            className="h-56 w-full border border-ink-100 dark:border-ink-800"
          />

          {googleUrl && (
            <a href={googleUrl} target="_blank" rel="noreferrer" className="chip w-full justify-center">
              <IconMap width={16} height={16} />
              この順番でGoogleマップで開く
            </a>
          )}

          {/* 区間ごとの距離 */}
          {summary && summary.legs.length > 0 && (
            <ul className="space-y-1 border-t border-ink-100 pt-2 text-xs text-ink-500 dark:border-ink-800 dark:text-ink-400">
              {summary.legs.map((leg, i) => (
                <li key={`${leg.fromIndex}-${leg.toIndex}`} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {i + 1} → {i + 2}
                  </span>
                  <span className="shrink-0">
                    {formatDistance(leg.distance)}・約{formatDuration(leg.duration)}
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-2 border-t border-ink-100 pt-1 font-bold text-ink-700 dark:border-ink-800 dark:text-ink-200">
                <span>1日の合計</span>
                <span>
                  {formatDistance(summary.totalDistance)}・約{formatDuration(summary.totalDuration)}
                </span>
              </li>
            </ul>
          )}
        </>
      )}
    </div>
  );
}
