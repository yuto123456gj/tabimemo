import { describe, expect, it } from 'vitest';
import {
  applyOrderToDay,
  diffForPersist,
  itemsForDay,
  moveToDay,
  moveWithinDay,
  normalizeOrders,
  reorderByDrop,
} from '@/lib/trips/reorder';

interface Item {
  id: string;
  day_index: number;
  order_index: number;
}

const items: Item[] = [
  { id: 'a', day_index: 0, order_index: 0 },
  { id: 'b', day_index: 0, order_index: 1 },
  { id: 'c', day_index: 0, order_index: 2 },
  { id: 'x', day_index: 1, order_index: 0 },
  { id: 'y', day_index: 1, order_index: 1 },
];

const ids = (list: Item[], day: number) => itemsForDay(list, day).map((i) => i.id);

describe('normalizeOrders', () => {
  it('歯抜けの order_index を 0 から振り直す', () => {
    const messy: Item[] = [
      { id: 'a', day_index: 0, order_index: 5 },
      { id: 'b', day_index: 0, order_index: 9 },
    ];
    expect(normalizeOrders(messy)).toEqual([
      { id: 'a', day_index: 0, order_index: 0 },
      { id: 'b', day_index: 0, order_index: 1 },
    ]);
  });
});

describe('moveWithinDay', () => {
  it('1つ上に動かせる', () => {
    expect(ids(moveWithinDay(items, 'c', -1), 0)).toEqual(['a', 'c', 'b']);
  });

  it('1つ下に動かせる', () => {
    expect(ids(moveWithinDay(items, 'a', 1), 0)).toEqual(['b', 'a', 'c']);
  });

  it('端を超えて動かそうとしても変わらない', () => {
    expect(ids(moveWithinDay(items, 'a', -1), 0)).toEqual(['a', 'b', 'c']);
    expect(ids(moveWithinDay(items, 'c', 1), 0)).toEqual(['a', 'b', 'c']);
  });

  it('他の日には影響しない', () => {
    expect(ids(moveWithinDay(items, 'a', 1), 1)).toEqual(['x', 'y']);
  });

  it('存在しないIDは無視する', () => {
    expect(moveWithinDay(items, 'zzz', 1)).toEqual(items);
  });
});

describe('moveToDay', () => {
  it('別の日の末尾に移動する', () => {
    const next = moveToDay(items, 'a', 1);
    expect(ids(next, 0)).toEqual(['b', 'c']);
    expect(ids(next, 1)).toEqual(['x', 'y', 'a']);
  });

  it('同じ日への移動は何もしない', () => {
    expect(moveToDay(items, 'a', 0)).toEqual(items);
  });

  it('マイナスの日は無視する', () => {
    expect(moveToDay(items, 'a', -1)).toEqual(items);
  });
});

describe('reorderByDrop', () => {
  it('同じ日の中で、対象の前に差し込む', () => {
    expect(ids(reorderByDrop(items, 'c', 'a'), 0)).toEqual(['c', 'a', 'b']);
  });

  it('after を指定すると後ろに入る', () => {
    expect(ids(reorderByDrop(items, 'a', 'c', 'after'), 0)).toEqual(['b', 'c', 'a']);
  });

  it('日をまたいでドロップできる', () => {
    const next = reorderByDrop(items, 'a', 'y');
    expect(ids(next, 0)).toEqual(['b', 'c']);
    expect(ids(next, 1)).toEqual(['x', 'a', 'y']);
  });

  it('自分自身へのドロップは無視する', () => {
    expect(reorderByDrop(items, 'a', 'a')).toEqual(items);
  });

  it('並べ替えても項目が増減しない', () => {
    const next = reorderByDrop(items, 'a', 'y');
    expect(next).toHaveLength(items.length);
    expect(new Set(next.map((i) => i.id)).size).toBe(items.length);
  });
});

describe('applyOrderToDay', () => {
  it('ルート最適化の結果を反映できる', () => {
    const next = applyOrderToDay(items, 0, ['c', 'a', 'b']);
    expect(ids(next, 0)).toEqual(['c', 'a', 'b']);
    expect(ids(next, 1)).toEqual(['x', 'y']);
  });

  it('IDが欠けていても落ちない（欠けたものは末尾へ）', () => {
    expect(ids(applyOrderToDay(items, 0, ['c']), 0)).toEqual(['c', 'a', 'b']);
  });
});

describe('diffForPersist', () => {
  it('変わった項目だけを返す', () => {
    const after = moveWithinDay(items, 'a', 1);
    const updates = diffForPersist(items, after);
    expect(updates.map((u) => u.id).sort()).toEqual(['a', 'b']);
    expect(updates.find((u) => u.id === 'a')).toEqual({ id: 'a', dayIndex: 0, orderIndex: 1 });
  });

  it('変化がなければ空配列', () => {
    expect(diffForPersist(items, normalizeOrders(items))).toEqual([]);
  });

  it('日をまたいだ移動も差分に含まれる', () => {
    const after = moveToDay(items, 'a', 1);
    const updates = diffForPersist(items, after);
    expect(updates.find((u) => u.id === 'a')).toEqual({ id: 'a', dayIndex: 1, orderIndex: 2 });
  });
});
