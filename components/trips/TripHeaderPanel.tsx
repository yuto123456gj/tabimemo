'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Card';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { IconCheck, IconShare, IconTrash } from '@/components/ui/Icons';
import { deleteTrip, markTripPlacesVisited, toggleTripPublic, updateTrip } from '@/lib/actions/trips';
import { formatJaDate, tripLengthLabel } from '@/lib/utils/date';
import type { Trip } from '@/types/database';

export function TripHeaderPanel({ trip, siteUrl }: { trip: Trip; siteUrl: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(trip.title);
  const [startDate, setStartDate] = useState(trip.start_date);
  const [endDate, setEndDate] = useState(trip.end_date);
  const [coverUrl, setCoverUrl] = useState(trip.cover_url ?? '');
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shareUrl = `${siteUrl}/s/${trip.public_share_token}`;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? '更新できませんでした。');
        return;
      }
      if (success) setMessage(success);
      router.refresh();
    });
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(`コピーできませんでした: ${shareUrl}`);
    }
  };

  return (
    <div className="card overflow-hidden p-0">
      <div className="relative h-32 bg-brand-gradient sm:h-40">
        {trip.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.cover_url} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="space-y-3 p-4">
        {error && <Notice tone="error">{error}</Notice>}
        {message && <Notice tone="success">{message}</Notice>}

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="edit-title">
                タイトル
              </label>
              <input id="edit-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="edit-start">
                  開始日
                </label>
                <input
                  id="edit-start"
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="edit-end">
                  終了日
                </label>
                <input
                  id="edit-end"
                  type="date"
                  className="input"
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="edit-cover">
                カバー画像URL
              </label>
              <input
                id="edit-cover"
                type="url"
                className="input"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const result = await updateTrip(trip.id, {
                      title,
                      start_date: startDate,
                      end_date: endDate,
                      cover_url: coverUrl.trim() || null,
                    });
                    if (result.ok) setEditing(false);
                    return result;
                  }, '保存しました')
                }
              >
                {pending ? <Spinner /> : '保存'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={pending}>
                やめる
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-extrabold tracking-tight text-ink-900 dark:text-white">{trip.title}</h1>
                <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                  {formatJaDate(trip.start_date)} 〜 {formatJaDate(trip.end_date)}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone="brand">{tripLengthLabel(trip.start_date, trip.end_date)}</Badge>
                  {trip.is_public && <Badge tone="accent">共有ページ公開中</Badge>}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                編集
              </Button>
            </div>

            {/* 共有 */}
            <div className="rounded-xl bg-ink-50 p-3 dark:bg-ink-800">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={trip.is_public}
                  disabled={pending}
                  onChange={(e) =>
                    run(
                      () => toggleTripPublic(trip.id, e.target.checked),
                      e.target.checked ? '共有ページを公開しました' : '共有ページを非公開にしました',
                    )
                  }
                  className="h-5 w-5 rounded border-ink-300 text-accent-500 focus:ring-accent-400"
                />
                <span className="text-sm font-medium">ログイン不要の共有ページを公開する</span>
              </label>

              {trip.is_public && (
                <div className="mt-2.5 space-y-2">
                  <p className="break-all font-mono text-[11px] text-ink-500 dark:text-ink-400">{shareUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={copyShareUrl}>
                      <IconShare width={16} height={16} />
                      {copied ? 'コピーしました' : 'URLをコピー'}
                    </Button>
                    <a href={`/s/${trip.public_share_token}`} target="_blank" rel="noreferrer" className="chip">
                      共有ページを見る
                    </a>
                  </div>
                  <p className="text-[11px] text-ink-400">
                    URLを知っている人だけが見られます。印刷すると紙のしおりとしても使えます。
                  </p>
                </div>
              )}
            </div>

            {/* 操作 */}
            <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const result = await markTripPlacesVisited(trip.id);
                    return result;
                  }, 'しおりのスポットを「行った！」にしました')
                }
              >
                <IconCheck width={16} height={16} />
                まとめて「行った！」にする
              </Button>

              {confirming ? (
                <span className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteTrip(trip.id);
                        if (!result.ok) {
                          setError(result.error ?? '削除できませんでした。');
                          return;
                        }
                        router.push('/trips');
                      })
                    }
                  >
                    {pending ? <Spinner /> : 'しおりを削除する'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                    やめる
                  </Button>
                </span>
              ) : (
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setConfirming(true)}>
                  <IconTrash width={16} height={16} />
                  削除
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
