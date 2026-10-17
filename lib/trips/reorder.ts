/**
 * しおりの並べ替えロジック（純粋関数）。
 * UI（ドラッグ&ドロップ / 上下ボタン / 日の移動 / ルート最適化）から共通で使う。
 */

export interface OrderableItem {
  id: string;
  day_index: number;
  order_index: number;
}

/** 日ごとに order_index を 0,1,2... に振り直す */
export function normalizeOrders<T extends OrderableItem>(items: T[]): T[] {
  const byDay = new Map<number, T[]>();
  for (const item of items) {
    const list = byDay.get(item.day_index) ?? [];
    list.push(item);
    byDay.set(item.day_index, list);
  }

  const result: T[] = [];
  for (const [day, list] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
    list
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .forEach((item, index) => {
        result.push({ ...item, day_index: day, order_index: index });
      });
  }
  return result;
}

export function itemsForDay<T extends OrderableItem>(items: T[], dayIndex: number): T[] {
  return items
    .filter((i) => i.day_index === dayIndex)
    .slice()
    .sort((a, b) => a.order_index - b.order_index);
}

/** 同じ日の中で1つ上/下に動かす */
export function moveWithinDay<T extends OrderableItem>(items: T[], id: string, direction: -1 | 1): T[] {
  const target = items.find((i) => i.id === id);
  if (!target) return items;

  const day = itemsForDay(items, target.day_index);
  const index = day.findIndex((i) => i.id === id);
  const swapIndex = index + direction;
  if (index < 0 || swapIndex < 0 || swapIndex >= day.length) return items;

  const reordered = [...day];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(swapIndex, 0, moved);

  const others = items.filter((i) => i.day_index !== target.day_index);
  return normalizeOrders([
    ...others,
    ...reordered.map((item, i) => ({ ...item, order_index: i })),
  ]);
}

/** 別の日に移す（移動先の末尾に入る） */
export function moveToDay<T extends OrderableItem>(items: T[], id: string, newDayIndex: number): T[] {
  const target = items.find((i) => i.id === id);
  if (!target || newDayIndex < 0 || newDayIndex === target.day_index) return items;

  const destination = itemsForDay(items, newDayIndex);
  const updated = items.map((i) =>
    i.id === id ? { ...i, day_index: newDayIndex, order_index: destination.length } : i,
  );
  return normalizeOrders(updated);
}

/**
 * ドラッグ&ドロップ: dragId を targetId の位置に差し込む。
 * targetId が別の日の項目なら、日をまたいだ移動になる。
 */
export function reorderByDrop<T extends OrderableItem>(
  items: T[],
  dragId: string,
  targetId: string,
  position: 'before' | 'after' = 'before',
): T[] {
  if (dragId === targetId) return items;

  const drag = items.find((i) => i.id === dragId);
  const target = items.find((i) => i.id === targetId);
  if (!drag || !target) return items;

  const destinationDay = target.day_index;
  const dayItems = itemsForDay(items, destinationDay).filter((i) => i.id !== dragId);
  const targetIndex = dayItems.findIndex((i) => i.id === targetId);
  const insertAt = position === 'after' ? targetIndex + 1 : targetIndex;

  const nextDay = [...dayItems];
  nextDay.splice(insertAt, 0, { ...drag, day_index: destinationDay });

  const others = items.filter((i) => i.day_index !== destinationDay && i.id !== dragId);
  return normalizeOrders([...others, ...nextDay.map((item, i) => ({ ...item, order_index: i }))]);
}

/** 指定した日を、与えられたID順に並べ替える（ルート最適化の適用で使う） */
export function applyOrderToDay<T extends OrderableItem>(items: T[], dayIndex: number, orderedIds: string[]): T[] {
  const day = itemsForDay(items, dayIndex);
  const rank = new Map(orderedIds.map((id, i) => [id, i]));
  const reordered = day
    .slice()
    .sort((a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER));

  const others = items.filter((i) => i.day_index !== dayIndex);
  return normalizeOrders([...others, ...reordered.map((item, i) => ({ ...item, order_index: i }))]);
}

/** サーバーに保存すべき差分だけを取り出す */
export function diffForPersist<T extends OrderableItem>(
  before: T[],
  after: T[],
): Array<{ id: string; dayIndex: number; orderIndex: number }> {
  const prev = new Map(before.map((i) => [i.id, i]));
  const updates: Array<{ id: string; dayIndex: number; orderIndex: number }> = [];

  for (const item of after) {
    const old = prev.get(item.id);
    if (!old || old.day_index !== item.day_index || old.order_index !== item.order_index) {
      updates.push({ id: item.id, dayIndex: item.day_index, orderIndex: item.order_index });
    }
  }
  return updates;
}
