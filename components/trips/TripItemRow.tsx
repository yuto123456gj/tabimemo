'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Card';
import { IconChevronDown, IconChevronUp, IconClock, IconDrag, IconTrash } from '@/components/ui/Icons';
import { TRANSPORT_MODES, categoryMeta, transportMeta } from '@/lib/constants';
import { formatJaTime, formatStayMinutes } from '@/lib/utils/date';
import { formatDistance, formatDuration } from '@/lib/route/geo';
import { cn } from '@/lib/utils/cn';
import type { TripItemWithPlace } from '@/types/database';

export interface ItemPatch {
  arrive_time?: string | null;
  stay_minutes?: number | null;
  transport?: string | null;
  memo?: string | null;
  custom_title?: string | null;
}

export function TripItemRow({
  item,
  index,
  total,
  dayCount,
  leg,
  isDragging,
  isDropTarget,
  onMove,
  onMoveDay,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOverItem,
  onDropItem,
}: {
  item: TripItemWithPlace;
  index: number;
  total: number;
  dayCount: number;
  leg?: { distance: number; duration: number } | null;
  isDragging: boolean;
  isDropTarget: boolean;
  onMove: (id: string, direction: -1 | 1) => void;
  onMoveDay: (id: string, dayIndex: number) => void;
  onUpdate: (id: string, patch: ItemPatch) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverItem: (id: string) => void;
  onDropItem: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const place = item.places ?? null;
  const title = place?.name ?? item.custom_title ?? '（名称未設定）';
  const meta = place ? categoryMeta(place.category) : null;

  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(item.id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverItem(item.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropItem(item.id);
      }}
      className={cn(
        'card p-0 transition',
        isDragging && 'opacity-40',
        isDropTarget && 'ring-2 ring-brand-400',
      )}
    >
      {/* 区間の移動情報（前の項目からの距離・時間） */}
      {leg && index > 0 && (
        <div className="flex items-center gap-1.5 border-b border-dashed border-ink-100 px-3 py-1.5 text-[11px] text-ink-400 dark:border-ink-800">
          <span>{transportMeta(item.transport).emoji}</span>
          <span>
            {formatDistance(leg.distance)}・約{formatDuration(leg.duration)}
          </span>
        </div>
      )}

      <div className="flex items-start gap-2.5 p-3">
        <span className="hidden cursor-grab pt-1 text-ink-300 md:block" aria-hidden="true">
          <IconDrag width={16} height={16} />
        </span>

        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {place ? (
                <Link
                  href={`/places/${place.id}`}
                  className="block truncate font-bold text-ink-900 hover:underline dark:text-ink-50"
                >
                  {title}
                </Link>
              ) : (
                <p className="truncate font-bold text-ink-900 dark:text-ink-50">{title}</p>
              )}
              {place?.address && (
                <p className="truncate text-xs text-ink-500 dark:text-ink-400">{place.address}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="shrink-0 rounded-md p-1 text-ink-400 transition hover:bg-ink-100 dark:hover:bg-ink-800"
              aria-label={open ? '詳細を閉じる' : '詳細を開く'}
              aria-expanded={open}
            >
              {open ? <IconChevronUp width={18} height={18} /> : <IconChevronDown width={18} height={18} />}
            </button>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {meta && <Badge tone="brand">{meta.emoji} {meta.label}</Badge>}
            {!place && <Badge tone="accent">フリー項目</Badge>}
            {item.arrive_time && (
              <Badge tone="neutral">
                <IconClock width={12} height={12} />
                {formatJaTime(item.arrive_time)}
              </Badge>
            )}
            {item.stay_minutes ? <Badge tone="neutral">滞在 {formatStayMinutes(item.stay_minutes)}</Badge> : null}
          </div>

          {item.memo && !open && (
            <p className="mt-1.5 line-clamp-2 text-xs text-ink-600 dark:text-ink-300">{item.memo}</p>
          )}

          {/* モバイル用の並べ替え操作（ドラッグが使えない端末向け） */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onMove(item.id, -1)}
              disabled={index === 0}
              className="chip px-2 py-1 text-xs disabled:opacity-40"
              aria-label="1つ上へ"
            >
              <IconChevronUp width={14} height={14} />
            </button>
            <button
              type="button"
              onClick={() => onMove(item.id, 1)}
              disabled={index === total - 1}
              className="chip px-2 py-1 text-xs disabled:opacity-40"
              aria-label="1つ下へ"
            >
              <IconChevronDown width={14} height={14} />
            </button>
            {dayCount > 1 && (
              <label className="flex items-center gap-1 text-xs text-ink-500 dark:text-ink-400">
                <span className="sr-only">日を移動</span>
                <select
                  value={item.day_index}
                  onChange={(e) => onMoveDay(item.id, Number(e.target.value))}
                  className="rounded-pill border border-ink-200 bg-white px-2 py-1 text-xs dark:border-ink-700 dark:bg-ink-900"
                >
                  {Array.from({ length: dayCount }).map((_, d) => (
                    <option key={d} value={d}>
                      {d + 1}日目へ
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="chip ml-auto px-2 py-1 text-xs text-red-500"
              aria-label="この項目を削除"
            >
              <IconTrash width={14} height={14} />
            </button>
          </div>

          {/* 詳細編集 */}
          {open && (
            <div className="mt-3 space-y-3 border-t border-ink-100 pt-3 dark:border-ink-800">
              {!place && (
                <div>
                  <label className="label" htmlFor={`title-${item.id}`}>
                    項目名
                  </label>
                  <input
                    id={`title-${item.id}`}
                    className="input"
                    defaultValue={item.custom_title ?? ''}
                    onBlur={(e) => onUpdate(item.id, { custom_title: e.target.value.trim() || null })}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor={`arrive-${item.id}`}>
                    到着時刻
                  </label>
                  <input
                    id={`arrive-${item.id}`}
                    type="time"
                    className="input"
                    defaultValue={item.arrive_time?.slice(0, 5) ?? ''}
                    onBlur={(e) => onUpdate(item.id, { arrive_time: e.target.value || null })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor={`stay-${item.id}`}>
                    滞在（分）
                  </label>
                  <input
                    id={`stay-${item.id}`}
                    type="number"
                    min={0}
                    step={15}
                    className="input"
                    defaultValue={item.stay_minutes ?? ''}
                    onBlur={(e) =>
                      onUpdate(item.id, { stay_minutes: e.target.value === '' ? null : Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div>
                <span className="label">ここへの移動手段</span>
                <div className="flex flex-wrap gap-1.5">
                  {TRANSPORT_MODES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => onUpdate(item.id, { transport: t.value })}
                      className={cn('chip px-2.5 py-1 text-xs', item.transport === t.value && 'chip-active')}
                    >
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label" htmlFor={`memo-${item.id}`}>
                  メモ
                </label>
                <textarea
                  id={`memo-${item.id}`}
                  className="input min-h-[64px] resize-y"
                  defaultValue={item.memo ?? ''}
                  onBlur={(e) => onUpdate(item.id, { memo: e.target.value.trim() || null })}
                  placeholder="予約済み / 現金のみ / 早めに行く"
                />
              </div>
              <p className="text-[11px] text-ink-400">入力後、フォーカスを外すと保存されます。</p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
