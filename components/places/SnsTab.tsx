'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { categoryMeta } from '@/lib/constants';
import { SavePlaceForm, type DraftPlace } from './SavePlaceForm';
import type { PlaceCandidate } from '@/lib/providers/places/types';
import type { ExtractResult } from '@/lib/providers/extract/types';
import type { PlaceList } from '@/types/database';

interface ExtractResponse extends ExtractResult {
  candidates: PlaceCandidate[];
  searchProvider: string | null;
  searchNote?: string;
}

const SAMPLE = `📍喫茶ソワレ
京都・河原町の老舗喫茶。ゼリーポンチが可愛すぎた☕️
#京都カフェ #喫茶店
https://www.instagram.com/p/XXXXXXXX/`;

export function SnsTab({
  groupId,
  lists,
  initialText = '',
  autoRun = false,
}: {
  groupId: string;
  lists: PlaceList[];
  initialText?: string;
  autoRun?: boolean;
}) {
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<DraftPlace | null>(null);
  const [searchingQuery, setSearchingQuery] = useState<string | null>(null);

  const run = async (value: string) => {
    const body = value.trim();
    if (!body) {
      setError('投稿のテキストかURLを貼り付けてください。');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: body }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? '読み取りに失敗しました。');
        return;
      }
      setResult(json as ExtractResponse);
    } catch {
      setError('読み取りに失敗しました。通信状況を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  // 共有メニュー（Share Target）から来た時は自動で読み取る
  useEffect(() => {
    if (autoRun && initialText.trim()) void run(initialText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 別の候補キーワードで再検索する */
  const researchWith = async (query: string) => {
    setSearchingQuery(query);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      setResult((prev) => (prev ? { ...prev, candidates: (json.candidates ?? []).slice(0, 3) } : prev));
    } catch {
      setError('再検索に失敗しました。');
    } finally {
      setSearchingQuery(null);
    }
  };

  if (draft) {
    return (
      <SavePlaceForm
        draft={{ ...draft, sourceUrl: draft.sourceUrl ?? result?.sourceUrl ?? null }}
        groupId={groupId}
        lists={lists}
        onCancel={() => setDraft(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="sns-text">
          投稿のテキストやURLを貼り付け
        </label>
        <textarea
          id="sns-text"
          className="input min-h-[132px] resize-y font-normal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={SAMPLE}
        />
        <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
          投稿ページの中身は取得しません。貼り付けられたテキストとURLだけを使って、店名とエリアを読み取ります。
          スマホの共有メニューから「{'タビメモ'}」を選んでも同じことができます（ホーム画面に追加した場合）。
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => run(text)} disabled={loading} className="flex-1">
          {loading ? <Spinner /> : '場所を読み取る'}
        </Button>
        <Button variant="outline" onClick={() => setText(SAMPLE)} disabled={loading}>
          例を入れる
        </Button>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {result && (
        <div className="space-y-3">
          <Notice tone="info">
            読み取り方法: {result.provider === 'claude' ? 'Claude（AI抽出）' : 'かんたん抽出（ルールベース）'}
            {result.note && <span className="mt-1 block text-xs">{result.note}</span>}
            {result.searchNote && <span className="mt-1 block text-xs">{result.searchNote}</span>}
          </Notice>

          {result.spots.length > 0 && (
            <div>
              <p className="label">読み取れたキーワード（タップで再検索）</p>
              <div className="flex flex-wrap gap-2">
                {result.spots.map((s) => (
                  <button
                    key={s.query}
                    type="button"
                    onClick={() => researchWith(s.query)}
                    className="chip"
                    disabled={searchingQuery !== null}
                  >
                    {searchingQuery === s.query ? <Spinner className="h-3 w-3" /> : '🔎'} {s.query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {result.candidates.length > 0 ? (
            <div>
              <p className="label">候補（最大3件）から選んで保存</p>
              <ul className="space-y-2">
                {result.candidates.map((c, i) => (
                  <li key={`${c.externalId ?? c.name}-${i}`}>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          name: c.name,
                          address: c.address,
                          lat: c.lat,
                          lng: c.lng,
                          category: c.category ?? result.spots[0]?.category ?? null,
                          photoUrl: c.photoUrl,
                          externalId: c.externalId,
                          sourceUrl: result.sourceUrl,
                          memo: result.memo,
                          tags: result.tags,
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
          ) : (
            <Notice tone="warn">
              場所の候補が見つかりませんでした。上のキーワードを押して再検索するか、「検索」タブで店名とエリアを入れて探してください。
            </Notice>
          )}

          {result.tags.length > 0 && (
            <p className="text-xs text-accent-600 dark:text-accent-300">
              タグ候補: {result.tags.map((t) => `#${t}`).join(' ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
