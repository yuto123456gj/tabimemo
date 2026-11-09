'use client';

import { useState } from 'react';
import { IconChevronDown, IconChevronUp, IconClock } from '@/components/ui/Icons';

export interface OpeningValues {
  openTime: string;
  closeTime: string;
  openFrom: string;
  openUntil: string;
  hoursNote: string;
}

export const EMPTY_OPENING: OpeningValues = {
  openTime: '',
  closeTime: '',
  openFrom: '',
  openUntil: '',
  hoursNote: '',
};

/**
 * 営業時間・営業期間の入力欄（すべて任意）。
 * 普段は閉じておき、必要な人だけ開いて入れられるようにする。
 */
export function OpeningFields({
  value,
  onChange,
  idPrefix = 'opening',
  defaultOpen = false,
}: {
  value: OpeningValues;
  onChange: (next: OpeningValues) => void;
  idPrefix?: string;
  defaultOpen?: boolean;
}) {
  const hasAny = Object.values(value).some(Boolean);
  const [open, setOpen] = useState(defaultOpen || hasAny);

  const set = (patch: Partial<OpeningValues>) => onChange({ ...value, ...patch });

  return (
    <div className="rounded-xl border border-ink-200 dark:border-ink-700">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-3 text-left"
        aria-expanded={open}
      >
        <IconClock width={18} height={18} className="text-ink-400" />
        <span className="flex-1 text-sm font-medium text-ink-800 dark:text-ink-100">
          営業時間・営業期間
          <span className="ml-1 text-xs font-normal text-ink-400">（任意）</span>
        </span>
        {hasAny && !open && <span className="text-xs text-accent-600 dark:text-accent-300">設定あり</span>}
        {open ? (
          <IconChevronUp width={18} height={18} className="text-ink-400" />
        ) : (
          <IconChevronDown width={18} height={18} className="text-ink-400" />
        )}
      </button>

      {open && (
        <div className="space-y-3 border-t border-ink-100 p-3.5 dark:border-ink-800">
          <div>
            <span className="label">営業時間</span>
            <div className="flex items-center gap-2">
              <input
                id={`${idPrefix}-open-time`}
                type="time"
                className="input"
                value={value.openTime}
                onChange={(e) => set({ openTime: e.target.value })}
                aria-label="営業開始時刻"
              />
              <span className="shrink-0 text-ink-400">〜</span>
              <input
                id={`${idPrefix}-close-time`}
                type="time"
                className="input"
                value={value.closeTime}
                onChange={(e) => set({ closeTime: e.target.value })}
                aria-label="営業終了時刻"
              />
            </div>
            <p className="mt-1 text-xs text-ink-400">
              営業時間の目安として、一覧や地図に表示されます。
            </p>
          </div>

          <div>
            <span className="label">営業期間（期間限定のお店・イベント）</span>
            <div className="flex items-center gap-2">
              <input
                id={`${idPrefix}-open-from`}
                type="date"
                className="input"
                value={value.openFrom}
                onChange={(e) => set({ openFrom: e.target.value })}
                aria-label="営業期間の開始日"
              />
              <span className="shrink-0 text-ink-400">〜</span>
              <input
                id={`${idPrefix}-open-until`}
                type="date"
                className="input"
                value={value.openUntil}
                onChange={(e) => set({ openUntil: e.target.value })}
                aria-label="営業期間の終了日"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor={`${idPrefix}-note`}>
              補足（定休日など）
            </label>
            <input
              id={`${idPrefix}-note`}
              className="input"
              value={value.hoursNote}
              onChange={(e) => set({ hoursNote: e.target.value })}
              placeholder="月曜定休 / ラストオーダー19:30"
            />
          </div>
        </div>
      )}
    </div>
  );
}
