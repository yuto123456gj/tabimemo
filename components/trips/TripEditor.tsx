'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TripHeaderPanel } from './TripHeaderPanel';
import { TripItemRow, type ItemPatch } from './TripItemRow';
import { AddToDayPanel } from './AddToDayPanel';
import { RoutePanel, type RouteLegInfo } from './RoutePanel';
import { ChecklistPanel } from './ChecklistPanel';
import { BudgetPanel } from './BudgetPanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Feedback';
import {
  addTripItem,
  addTripItems,
  deleteTripItem,
  reorderTripItems,
  updateTripItem,
} from '@/lib/actions/trips';
import {
  applyOrderToDay,
  diffForPersist,
  itemsForDay,
  moveToDay,
  moveWithinDay,
  reorderByDrop,
} from '@/lib/trips/reorder';
import { formatJaMonthDay, tripDates } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import type { Trip, TripBudgetItem, TripChecklistItem, TripItemWithPlace, PlaceWithExtras } from '@/types/database';

export function TripEditor({
  trip,
  initialItems,
  checklist,
  budget,
  places,
  memberCount,
  siteUrl,
}: {
  trip: Trip;
  initialItems: TripItemWithPlace[];
  checklist: TripChecklistItem[];
  budget: TripBudgetItem[];
  places: PlaceWithExtras[];
  memberCount: number;
  siteUrl: string;
}) {
  const router = useRouter();
  const days = useMemo(() => tripDates(trip.start_date, trip.end_date), [trip.start_date, trip.end_date]);

  const [items, setItems] = useState(initialItems);
  const [activeDay, setActiveDay] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [routeResult, setRouteResult] = useState<{ orderedIds: string[]; legs: RouteLegInfo[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // サーバー側の内容が変わったら（他メンバーの編集・再検証）同期する
  const serverKey = useMemo(
    () => JSON.stringify(initialItems.map((i) => [i.id, i.day_index, i.order_index, i.arrive_time, i.stay_minutes, i.transport, i.memo, i.custom_title])),
    [initialItems],
  );
  useEffect(() => {
    setItems(initialItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  const dayItems = useMemo(() => itemsForDay(items, activeDay), [items, activeDay]);

  /** 並べ替えを楽観的に反映し、差分だけ保存する */
  const persistOrder = (next: TripItemWithPlace[]) => {
    const updates = diffForPersist(items, next);
    setItems(next);
    setRouteResult(null);
    if (updates.length === 0) return;

    setError(null);
    startTransition(async () => {
      const result = await reorderTripItems(trip.id, updates);
      if (!result.ok) {
        setError(result.error ?? '並べ替えを保存できませんでした。');
        setItems(initialItems);
        return;
      }
      router.refresh();
    });
  };

  const handleMove = (id: string, direction: -1 | 1) => persistOrder(moveWithinDay(items, id, direction));
  const handleMoveDay = (id: string, dayIndex: number) => persistOrder(moveToDay(items, id, dayIndex));

  const handleDropOnItem = (targetId: string) => {
    if (!dragId) return;
    persistOrder(reorderByDrop(items, dragId, targetId));
    setDragId(null);
    setDropTargetId(null);
  };

  /** 日タブへのドロップ = その日の末尾へ移動 */
  const handleDropOnDay = (dayIndex: number) => {
    if (!dragId) return;
    persistOrder(moveToDay(items, dragId, dayIndex));
    setDragId(null);
    setDropTargetId(null);
  };

  const handleUpdate = (id: string, patch: ItemPatch) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    setError(null);
    startTransition(async () => {
      const result = await updateTripItem(id, trip.id, patch);
      if (!result.ok) setError(result.error ?? '保存できませんでした。');
      else router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setRouteResult(null);
    setError(null);
    startTransition(async () => {
      const result = await deleteTripItem(id, trip.id);
      if (!result.ok) {
        setError(result.error ?? '削除できませんでした。');
        setItems(initialItems);
        return;
      }
      router.refresh();
    });
  };

  const handleAddPlaces = (placeIds: string[]) => {
    setError(null);
    startTransition(async () => {
      const result = await addTripItems(trip.id, activeDay, placeIds);
      if (!result.ok) setError(result.error ?? '追加できませんでした。');
      else router.refresh();
    });
  };

  const handleAddCustom = (title: string) => {
    setError(null);
    startTransition(async () => {
      const result = await addTripItem({ tripId: trip.id, dayIndex: activeDay, customTitle: title });
      if (!result.ok) setError(result.error ?? '追加できませんでした。');
      else router.refresh();
    });
  };

  const handleApplyRoute = (orderedIds: string[]) => {
    persistOrder(applyOrderToDay(items, activeDay, orderedIds));
  };

  /** 区間情報（その項目に「到着するまで」の距離・時間） */
  const legByItemId = useMemo(() => {
    const map = new Map<string, { distance: number; duration: number }>();
    if (!routeResult) return map;

    const routable = dayItems.filter((i) => i.places);
    const matches =
      routable.length === routeResult.orderedIds.length &&
      routable.every((item, i) => item.id === routeResult.orderedIds[i]);
    if (!matches) return map;

    routeResult.legs.forEach((leg, i) => {
      const toId = routeResult.orderedIds[i + 1];
      if (toId) map.set(toId, { distance: leg.distance, duration: leg.duration });
    });
    return map;
  }, [routeResult, dayItems]);

  const usedPlaceIds = items.map((i) => i.place_id).filter((id): id is string => Boolean(id));
  const dayLabel = `${activeDay + 1}日目`;

  return (
    <div className="space-y-5">
      <TripHeaderPanel trip={trip} siteUrl={siteUrl} />

      {error && <Notice tone="error">{error}</Notice>}

      {/* 日ごとのタブ（ドロップ先にもなる） */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div role="tablist" aria-label="日程" className="flex gap-2 pb-1">
          {days.map((date, index) => {
            const count = itemsForDay(items, index).length;
            return (
              <button
                key={date}
                type="button"
                role="tab"
                aria-selected={activeDay === index}
                onClick={() => setActiveDay(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnDay(index);
                }}
                className={cn(
                  'shrink-0 rounded-2xl border px-3.5 py-2 text-left transition',
                  activeDay === index
                    ? 'border-transparent bg-brand-500 text-white shadow-sm'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300',
                  dragId && 'ring-1 ring-brand-300',
                )}
              >
                <span className="block text-xs font-bold">{index + 1}日目</span>
                <span className={cn('block text-[11px]', activeDay === index ? 'text-white/80' : 'text-ink-400')}>
                  {formatJaMonthDay(date)}・{count}件
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {dragId && (
        <p className="text-center text-xs text-brand-600 dark:text-brand-300">
          日付タブの上にドロップすると、その日へ移動できます
        </p>
      )}

      {/* タイムライン */}
      <section>
        <h2 className="mb-2.5 text-sm font-bold text-ink-500 dark:text-ink-400">
          {dayLabel}のタイムライン（{formatJaMonthDay(days[activeDay] ?? trip.start_date)}）
        </h2>

        {dayItems.length === 0 ? (
          <EmptyState
            art="map"
            title={`${dayLabel}はまだ空っぽです`}
            description="保存済みのスポットから選んで追加しましょう。宿泊先や集合場所などのフリー項目も入れられます。"
          />
        ) : (
          <ul className="space-y-2.5">
            {dayItems.map((item, index) => (
              <TripItemRow
                key={item.id}
                item={item}
                index={index}
                total={dayItems.length}
                dayCount={days.length}
                leg={legByItemId.get(item.id) ?? null}
                isDragging={dragId === item.id}
                isDropTarget={dropTargetId === item.id && dragId !== item.id}
                onMove={handleMove}
                onMoveDay={handleMoveDay}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onDragStart={setDragId}
                onDragEnd={() => {
                  setDragId(null);
                  setDropTargetId(null);
                }}
                onDragOverItem={setDropTargetId}
                onDropItem={handleDropOnItem}
              />
            ))}
          </ul>
        )}

        <div className="mt-3">
          <AddToDayPanel
            places={places}
            usedPlaceIds={usedPlaceIds}
            area={trip.area_lat !== null && trip.area_lng !== null ? { lat: trip.area_lat, lng: trip.area_lng } : null}
            dayLabel={dayLabel}
            onAddPlaces={handleAddPlaces}
            onAddCustom={handleAddCustom}
            pending={pending}
          />
        </div>
      </section>

      {/* ルート最適化 */}
      <RoutePanel
        items={dayItems}
        dayLabel={dayLabel}
        onApply={handleApplyRoute}
        onRouteComputed={(orderedIds, legs) => setRouteResult({ orderedIds, legs })}
        pending={pending}
      />

      {/* 持ち物・予算 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChecklistPanel tripId={trip.id} items={checklist} />
        <BudgetPanel tripId={trip.id} items={budget} memberCount={memberCount} />
      </div>
    </div>
  );
}
