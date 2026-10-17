'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { IconPlus, IconTrash } from '@/components/ui/Icons';
import { addBudgetItem, deleteBudgetItem } from '@/lib/actions/trips';
import { formatYen } from '@/lib/utils/date';
import type { TripBudgetItem } from '@/types/database';

const CATEGORIES = ['交通', '宿泊', '食事', '入場料', 'おみやげ', 'その他'];

export function BudgetPanel({
  tripId,
  items,
  memberCount,
}: {
  tripId: string;
  items: TripBudgetItem[];
  memberCount: number;
}) {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = items.reduce((sum, i) => sum + i.amount, 0);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? '更新できませんでした。');
      else router.refresh();
    });
  };

  const add = () => {
    const value = Number(amount);
    if (!label.trim() || !Number.isFinite(value)) {
      setError('項目名と金額を入力してください。');
      return;
    }
    run(async () => {
      const result = await addBudgetItem(tripId, label, value, category);
      if (result.ok) {
        setLabel('');
        setAmount('');
      }
      return result;
    });
  };

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">予算メモ</h3>
        <span className="text-sm font-extrabold text-brand-600 dark:text-brand-300">{formatYen(total)}</span>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {items.length > 0 && (
        <>
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 py-2">
                {item.category && (
                  <span className="shrink-0 rounded-pill bg-ink-100 px-2 py-0.5 text-[10px] text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                    {item.category}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                <span className="shrink-0 text-sm font-medium tabular-nums">{formatYen(item.amount)}</span>
                <button
                  type="button"
                  className="shrink-0 rounded-md p-1 text-ink-300 transition hover:text-red-500"
                  aria-label={`${item.label} を削除`}
                  disabled={pending}
                  onClick={() => run(() => deleteBudgetItem(item.id, tripId))}
                >
                  <IconTrash width={15} height={15} />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2 text-sm dark:bg-ink-800">
            <span className="font-bold">合計</span>
            <span className="text-right">
              <span className="block font-extrabold tabular-nums">{formatYen(total)}</span>
              {memberCount > 1 && (
                <span className="block text-xs text-ink-500 dark:text-ink-400">
                  1人あたり {formatYen(total / memberCount)}（{memberCount}人）
                </span>
              )}
            </span>
          </div>
        </>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`chip px-2.5 py-1 text-xs ${category === c ? 'chip-active' : ''}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="新幹線（往復）"
          />
          <input
            className="input w-28"
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button variant="outline" onClick={add} disabled={pending}>
            {pending ? <Spinner /> : <IconPlus width={18} height={18} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
