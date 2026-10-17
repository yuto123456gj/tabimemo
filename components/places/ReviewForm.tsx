'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { StarRating } from '@/components/ui/StarRating';
import { deleteReview, upsertReview } from '@/lib/actions/places';
import { toDateInputValue } from '@/lib/utils/date';
import type { PlaceReview } from '@/types/database';

/** 「行った！」の記録はメンバーごと（自分の分だけ編集できる） */
export function ReviewForm({ placeId, review }: { placeId: string; review: PlaceReview | null }) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(review?.rating ?? null);
  const [visitedOn, setVisitedOn] = useState(review?.visited_on ?? toDateInputValue(new Date()));
  const [comment, setComment] = useState(review?.comment ?? '');
  const [wantAgain, setWantAgain] = useState(review?.want_again ?? false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await upsertReview(placeId, {
        rating,
        visited_on: visitedOn || null,
        comment: comment.trim() || null,
        want_again: wantAgain,
      });
      if (!result.ok) {
        setError(result.error ?? '保存できませんでした。');
        return;
      }
      setMessage('記録を保存しました');
      router.refresh();
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteReview(placeId);
      if (!result.ok) {
        setError(result.error ?? '削除できませんでした。');
        return;
      }
      setRating(null);
      setComment('');
      setWantAgain(false);
      setMessage('記録を削除しました');
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <span className="label">評価</span>
          <StarRating value={rating} onChange={setRating} />
        </div>
        <div>
          <label className="label" htmlFor="visited-on">
            行った日
          </label>
          <input
            id="visited-on"
            type="date"
            className="input w-auto"
            value={visitedOn}
            onChange={(e) => setVisitedOn(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="comment">
          感想
        </label>
        <textarea
          id="comment"
          className="input min-h-[80px] resize-y"
          placeholder="プリンが絶品。次は平日の朝に行きたい"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={wantAgain}
          onChange={(e) => setWantAgain(e.target.checked)}
          className="h-5 w-5 rounded border-ink-300 text-brand-500 focus:ring-brand-400"
        />
        💖 また行きたい
      </label>

      <div className="flex gap-2">
        <Button onClick={save} disabled={pending} className="flex-1">
          {pending ? <Spinner /> : review ? '記録を更新する' : '行った！を記録する'}
        </Button>
        {review && (
          <Button variant="outline" onClick={remove} disabled={pending}>
            削除
          </Button>
        )}
      </div>
    </div>
  );
}
