'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import {
  countCategoryUsage,
  createPlaceCategory,
  deletePlaceCategory,
} from '@/lib/actions/categories';
import { CATEGORY_LABEL_MAX } from '@/lib/utils/category';
import { cn } from '@/lib/utils/cn';
import type { PlaceCategoryRow } from '@/types/database';

/** 絵文字キーボードを出さなくても選べるように、よく使うものを並べておく */
const EMOJI_SUGGESTIONS = ['📍', '🍜', '🍣', '🍰', '🍺', '♨️', '🎣', '🎬', '🏛️', '🎨', '⚽️', '🐶'];

/** 長押し（500ms）を検知する。スマホの文字選択・コンテキストメニューは抑える。 */
function useLongPress(onLongPress: () => void, ms = 500) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);

  const clear = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  return {
    /** 長押しが成立した直後の click を無視するために使う */
    didLongPress: () => fired.current,
    handlers: {
      onPointerDown: () => {
        fired.current = false;
        clear();
        timer.current = window.setTimeout(() => {
          fired.current = true;
          onLongPress();
        }, ms);
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}

/**
 * カテゴリを選ぶ。長押しで削除、「＋ 追加」で自分のカテゴリを作れる。
 */
export function CategoryPicker({
  groupId,
  categories,
  value,
  onChange,
}: {
  groupId: string;
  categories: PlaceCategoryRow[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('📍');
  const [target, setTarget] = useState<{ category: PlaceCategoryRow; count: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const askDelete = (category: PlaceCategoryRow) => {
    setError(null);
    setTarget({ category, count: null });
    // 件数は確認画面を出してから埋める（長押しの反応を待たせない）
    countCategoryUsage(groupId, category.value).then((result) => {
      setTarget((current) =>
        current && current.category.id === category.id
          ? { ...current, count: result.ok ? (result.data ?? 0) : 0 }
          : current,
      );
    });
  };

  const add = () => {
    setError(null);
    startTransition(async () => {
      const result = await createPlaceCategory(groupId, newLabel, newEmoji);
      if (!result.ok || !result.data) {
        setError(result.error ?? 'カテゴリを追加できませんでした。');
        return;
      }
      onChange(result.data.value);
      setNewLabel('');
      setNewEmoji('📍');
      setAdding(false);
      router.refresh();
    });
  };

  const remove = () => {
    if (!target) return;
    const { category } = target;
    setError(null);
    startTransition(async () => {
      const result = await deletePlaceCategory(category.id);
      if (!result.ok) {
        setError(result.error ?? 'カテゴリを削除できませんでした。');
        return;
      }
      if (value === category.value) onChange(null);
      setTarget(null);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label">カテゴリ</span>
        <span className="text-[11px] text-ink-400">長押しで削除できます</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            category={c}
            selected={value === c.value}
            onSelect={() => onChange(c.value)}
            onLongPress={() => askDelete(c)}
          />
        ))}

        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className={cn('chip border-dashed', adding && 'chip-active')}
        >
          ＋ 追加
        </button>
      </div>

      {adding && (
        <div className="mt-3 rounded-card border border-ink-100 bg-ink-50 p-3 dark:border-ink-800 dark:bg-ink-900">
          <label className="label" htmlFor="new-category">
            カテゴリの名前
          </label>
          <div className="flex gap-2">
            <input
              id="new-category"
              className="input flex-1"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newLabel.trim() && !pending) add();
              }}
              placeholder="ラーメン、温泉 など"
              maxLength={CATEGORY_LABEL_MAX}
            />
            <Button type="button" onClick={add} disabled={pending || !newLabel.trim()}>
              {pending ? <Spinner /> : '追加'}
            </Button>
          </div>

          <p className="label mt-3">アイコン</p>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_SUGGESTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setNewEmoji(e)}
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-xl border text-lg transition',
                  newEmoji === e
                    ? 'border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-900/40'
                    : 'border-ink-200 dark:border-ink-700',
                )}
                aria-label={`アイコン ${e}`}
                aria-pressed={newEmoji === e}
              >
                {e}
              </button>
            ))}
            <input
              className="input h-9 w-16 text-center text-lg"
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              aria-label="アイコンを自分で入れる"
            />
          </div>
        </div>
      )}

      {error && (
        <Notice tone="error" className="mt-2">
          {error}
        </Notice>
      )}

      {target && (
        <DeleteDialog
          label={target.category.label}
          emoji={target.category.emoji}
          count={target.count}
          pending={pending}
          onCancel={() => setTarget(null)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}

function CategoryChip({
  category,
  selected,
  onSelect,
  onLongPress,
}: {
  category: PlaceCategoryRow;
  selected: boolean;
  onSelect: () => void;
  onLongPress: () => void;
}) {
  const { handlers, didLongPress } = useLongPress(onLongPress);

  return (
    <button
      type="button"
      {...handlers}
      onClick={() => {
        // 長押しで確認が出たときは、選択まで起こさない
        if (didLongPress()) return;
        onSelect();
      }}
      className={cn('chip select-none', selected && 'chip-active')}
    >
      {category.emoji} {category.label}
    </button>
  );
}

/** 削除の確認（件数が分かるまでは「数えています…」と出す） */
function DeleteDialog({
  label,
  emoji,
  count,
  pending,
  onCancel,
  onConfirm,
}: {
  label: string;
  emoji: string;
  count: number | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="カテゴリの削除"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-card bg-white p-5 shadow-lift dark:bg-ink-900"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-bold text-ink-900 dark:text-ink-50">
          「{emoji} {label}」を削除しますか？
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
          {count === null ? (
            '使っているスポットを数えています…'
          ) : count === 0 ? (
            'このカテゴリのスポットはありません。'
          ) : (
            <>
              このカテゴリのスポットが<strong className="mx-0.5">{count}件</strong>あります。
              削除すると「その他」になります（スポット自体は消えません）。
            </>
          )}
        </p>

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={pending}>
            やめる
          </Button>
          <Button type="button" variant="danger" className="flex-1" onClick={onConfirm} disabled={pending}>
            {pending ? <Spinner /> : '削除する'}
          </Button>
        </div>
      </div>
    </div>
  );
}
