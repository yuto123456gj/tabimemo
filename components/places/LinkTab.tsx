'use client';

import { useMemo, useState } from 'react';
import { MapContainer } from '@/components/map/MapContainer';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { IconLink, IconMap, IconSearch } from '@/components/ui/Icons';
import { extractWithRules } from '@/lib/providers/extract/rule';
import { categoryMeta } from '@/lib/constants';
import { SavePlaceForm, type DraftPlace } from './SavePlaceForm';
import type { PlaceCandidate } from '@/lib/providers/places/types';
import type { PlaceList } from '@/types/database';

/** URLのドメインから「どこのリンクか」を言い当てる（表示用） */
function detectService(text: string): { label: string; url: string } | null {
  const match = text.match(/https?:\/\/[^\s<>"'）)」】]+/);
  if (!match) return null;
  const url = match[0];
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return { label: 'リンク', url };
  }
  const table: Array<[RegExp, string]> = [
    [/instagram\.com/, 'Instagram の投稿'],
    [/tiktok\.com/, 'TikTok の動画'],
    [/lemon8-app\.com|lemon8/, 'Lemon8 の投稿'],
    [/(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/, 'Googleマップ'],
    [/x\.com|twitter\.com/, 'X（Twitter）の投稿'],
    [/youtube\.com|youtu\.be/, 'YouTube'],
    [/tabelog\.com/, '食べログ'],
    [/retty\.me/, 'Retty'],
  ];
  for (const [re, label] of table) {
    if (re.test(host)) return { label, url };
  }
  return { label: host, url };
}

/**
 * 「行きたい場所のリンクを貼って、名前は自分で書く」タブ。
 *
 * SNSの中身を自動取得することはしない（規約・安定性の都合）。
 * 代わりに、貼り付けたテキストに本文が含まれていれば名前の候補だけ下書きする。
 */
export function LinkTab({
  groupId,
  lists,
  initialText = '',
}: {
  groupId: string;
  lists: PlaceList[];
  initialText?: string;
}) {
  const [pasted, setPasted] = useState(initialText);
  const [name, setName] = useState('');
  const [candidates, setCandidates] = useState<PlaceCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftPlace | null>(null);
  const [pickOnMap, setPickOnMap] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);

  const service = useMemo(() => detectService(pasted), [pasted]);

  /** 貼り付けたテキストから名前の候補を作る（通信なし・その場で計算） */
  const suggestion = useMemo(() => {
    if (!pasted.trim()) return null;
    const result = extractWithRules(pasted);
    const best = result.spots.find((s) => s.name)?.name;
    return best && best !== name ? best : null;
  }, [pasted, name]);

  const searchPlace = async () => {
    const q = name.trim();
    if (q.length < 2) {
      setError('スポット名を2文字以上入れてください。');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? '場所を探せませんでした。');
        setCandidates([]);
        return;
      }
      setCandidates(json.candidates ?? []);
      if ((json.candidates ?? []).length === 0) setPickOnMap(true);
    } catch {
      setError('場所を探せませんでした。通信状況を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  if (draft) {
    return <SavePlaceForm draft={draft} groupId={groupId} lists={lists} onCancel={() => setDraft(null)} />;
  }

  return (
    <div className="space-y-5">
      {/* ① リンク */}
      <div>
        <label className="label" htmlFor="link-paste">
          リンク（任意）
        </label>
        <textarea
          id="link-paste"
          className="input min-h-[80px] resize-y"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder={'https://www.instagram.com/p/XXXXXXXX/\n\n※ 本文ごと貼り付けてもOKです'}
        />
        {service && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-accent-600 dark:text-accent-300">
            <IconLink width={14} height={14} />
            {service.label}のリンクとして保存します
          </p>
        )}
        <p className="mt-1 text-xs text-ink-400">
          あとで「元の投稿を見る」ボタンから開けます。空のままでも大丈夫です。
        </p>
      </div>

      {/* ② 名前 */}
      <div>
        <label className="label" htmlFor="link-name">
          スポット名 <span className="text-brand-500">必須</span>
        </label>
        <input
          id="link-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 喫茶ソワレ"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void searchPlace();
            }
          }}
        />
        {suggestion && (
          <button
            type="button"
            onClick={() => setName(suggestion)}
            className="mt-1.5 text-xs text-brand-600 underline dark:text-brand-300"
          >
            貼り付けた文から「{suggestion}」を名前に入れる
          </button>
        )}
      </div>

      {/* ③ 場所を決める */}
      <div>
        <span className="label">場所を決める</span>
        <div className="flex gap-2">
          <Button onClick={searchPlace} disabled={loading || name.trim().length < 2} className="flex-1">
            {loading ? <Spinner /> : <IconSearch width={18} height={18} />}
            この名前で地図から探す
          </Button>
          <Button variant="outline" onClick={() => setPickOnMap((v) => !v)}>
            <IconMap width={18} height={18} />
            地図で指定
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-ink-400">
          地図上の位置が決まると、しおりのルート計算や「近い順」並べ替えに使えるようになります。
        </p>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {/* 候補 */}
      {candidates && candidates.length > 0 && (
        <div>
          <p className="label">候補から選ぶ</p>
          <ul className="space-y-2">
            {candidates.map((c, i) => (
              <li key={`${c.externalId ?? c.name}-${i}`}>
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      // 名前は自分が書いたものを優先する
                      name: name.trim() || c.name,
                      address: c.address,
                      lat: c.lat,
                      lng: c.lng,
                      category: c.category,
                      photoUrl: c.photoUrl,
                      externalId: c.externalId,
                      sourceUrl: service?.url ?? null,
                    })
                  }
                  className="card flex w-full items-center gap-3 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-gradient text-lg dark:bg-ink-800">
                    {categoryMeta(c.category).emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-ink-900 dark:text-ink-50">{c.name}</span>
                    <span className="block truncate text-xs text-ink-500 dark:text-ink-400">
                      {c.address ?? '住所不明'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {candidates && candidates.length === 0 && !error && (
        <Notice tone="warn">
          地図上で見つかりませんでした。下の地図をタップして、場所を直接指定してください。
        </Notice>
      )}

      {/* 地図で指定 */}
      {pickOnMap && (
        <div>
          <p className="label">地図をタップして場所を指定</p>
          <MapContainer
            markers={picked ? [{ id: 'picked', lat: picked.lat, lng: picked.lng, label: name }] : []}
            onMapClick={setPicked}
            className="h-60 w-full border border-ink-100 dark:border-ink-800"
          />
          {picked && (
            <Button
              className="mt-3 w-full"
              disabled={name.trim().length < 1}
              onClick={() =>
                setDraft({
                  name: name.trim(),
                  address: null,
                  lat: picked.lat,
                  lng: picked.lng,
                  category: null,
                  sourceUrl: service?.url ?? null,
                })
              }
            >
              この場所で登録する（{picked.lat.toFixed(4)}, {picked.lng.toFixed(4)}）
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
