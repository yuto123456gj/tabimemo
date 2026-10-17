import { describe, expect, it } from 'vitest';
import {
  buildHaversineMatrix,
  nearestNeighborOrder,
  optimizeRoute,
  pathCost,
  twoOptImprove,
} from '@/lib/route/optimize';
import { haversineDistance } from '@/lib/route/geo';
import type { RoutePoint } from '@/lib/route/types';

/**
 * 固定座標のテストデータ。
 * 東京の西→東に、ほぼ一直線に並ぶ6地点（約1kmおき）。
 * 最短ルートは「西から東に素直に並べた順」になる。
 */
const LINE_POINTS: RoutePoint[] = [
  { id: 'p0', lat: 35.6812, lng: 139.7000, name: '0' },
  { id: 'p1', lat: 35.6812, lng: 139.7110, name: '1' },
  { id: 'p2', lat: 35.6812, lng: 139.7220, name: '2' },
  { id: 'p3', lat: 35.6812, lng: 139.7330, name: '3' },
  { id: 'p4', lat: 35.6812, lng: 139.7440, name: '4' },
  { id: 'p5', lat: 35.6812, lng: 139.7550, name: '5' },
];

/** 入力順がわざと行ったり来たりしている並び */
const ZIGZAG: RoutePoint[] = [
  LINE_POINTS[0],
  LINE_POINTS[3],
  LINE_POINTS[1],
  LINE_POINTS[4],
  LINE_POINTS[2],
  LINE_POINTS[5],
];

describe('haversineDistance', () => {
  it('同じ地点は0mになる', () => {
    expect(haversineDistance(LINE_POINTS[0], LINE_POINTS[0])).toBe(0);
  });

  it('東京駅〜大阪駅はおよそ400km', () => {
    const tokyo = { lat: 35.6812, lng: 139.7671 };
    const osaka = { lat: 34.7025, lng: 135.4959 };
    const km = haversineDistance(tokyo, osaka) / 1000;
    expect(km).toBeGreaterThan(390);
    expect(km).toBeLessThan(420);
  });
});

describe('buildHaversineMatrix', () => {
  it('対角成分は0で、対称な行列になる', () => {
    const matrix = buildHaversineMatrix(LINE_POINTS);
    expect(matrix.source).toBe('haversine');
    for (let i = 0; i < LINE_POINTS.length; i += 1) {
      expect(matrix.distances[i][i]).toBe(0);
      for (let j = 0; j < LINE_POINTS.length; j += 1) {
        expect(matrix.distances[i][j]).toBeCloseTo(matrix.distances[j][i], 6);
      }
    }
  });

  it('徒歩の方が車より所要時間が長い', () => {
    const walk = buildHaversineMatrix(LINE_POINTS, 'walk');
    const car = buildHaversineMatrix(LINE_POINTS, 'car');
    expect(walk.durations[0][5]).toBeGreaterThan(car.durations[0][5]);
  });
});

describe('optimizeRoute', () => {
  it('総距離が単純な入力順より短くなる', () => {
    const matrix = buildHaversineMatrix(ZIGZAG);
    const result = optimizeRoute(ZIGZAG, matrix);

    expect(result.totalDistance).toBeLessThan(result.originalDistance);
    expect(result.improvedBy).toBeGreaterThan(0);
    // 一直線なので、最適解は端から端までの距離に等しくなる
    const endToEnd = matrix.distances[0][5];
    expect(result.totalDistance).toBeCloseTo(endToEnd, 0);
  });

  it('すべての地点をちょうど1回ずつ通る', () => {
    const matrix = buildHaversineMatrix(ZIGZAG);
    const result = optimizeRoute(ZIGZAG, matrix);
    expect([...result.order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('開始地点の固定が守られる', () => {
    const matrix = buildHaversineMatrix(ZIGZAG);
    const result = optimizeRoute(ZIGZAG, matrix, { startIndex: 5 });
    expect(result.order[0]).toBe(5);
    expect(result.order).toHaveLength(ZIGZAG.length);
  });

  it('終了地点の固定が守られる', () => {
    const matrix = buildHaversineMatrix(ZIGZAG);
    const result = optimizeRoute(ZIGZAG, matrix, { endIndex: 0 });
    expect(result.order[result.order.length - 1]).toBe(0);
  });

  it('開始・終了の両方の固定が守られる（ホテル発→空港着）', () => {
    const matrix = buildHaversineMatrix(ZIGZAG);
    // ZIGZAG[0] は一番西、ZIGZAG[5] は一番東
    const result = optimizeRoute(ZIGZAG, matrix, { startIndex: 0, endIndex: 5 });
    expect(result.order[0]).toBe(0);
    expect(result.order[result.order.length - 1]).toBe(5);
    expect([...result.order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(result.totalDistance).toBeLessThan(result.originalDistance);
  });

  it('開始と終了に同じ地点を指定しても地点が重複しない', () => {
    const matrix = buildHaversineMatrix(ZIGZAG);
    const result = optimizeRoute(ZIGZAG, matrix, { startIndex: 2, endIndex: 2 });
    expect(result.order[0]).toBe(2);
    expect(new Set(result.order).size).toBe(ZIGZAG.length);
  });

  it('地点が2件以下なら入力順のまま返す', () => {
    const two = ZIGZAG.slice(0, 2);
    const matrix = buildHaversineMatrix(two);
    expect(optimizeRoute(two, matrix).order).toEqual([0, 1]);

    const one = ZIGZAG.slice(0, 1);
    expect(optimizeRoute(one, buildHaversineMatrix(one)).order).toEqual([0]);

    expect(optimizeRoute([], buildHaversineMatrix([])).order).toEqual([]);
  });

  it('所要時間を指標にしても全地点を通る', () => {
    const matrix = buildHaversineMatrix(ZIGZAG, 'walk');
    const result = optimizeRoute(ZIGZAG, matrix, { metric: 'duration' });
    expect([...result.order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(result.totalDuration).toBeLessThanOrEqual(result.originalDuration);
  });

  it('提案が元の順番より悪くなることはない', () => {
    // すでに最短の並びを渡しても悪化しない
    const matrix = buildHaversineMatrix(LINE_POINTS);
    const result = optimizeRoute(LINE_POINTS, matrix);
    expect(result.totalDistance).toBeLessThanOrEqual(result.originalDistance + 1e-6);
  });

  it('15地点を1秒以内に計算できる', () => {
    // 疑似乱数（毎回同じ結果になるようにシード固定）
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const points: RoutePoint[] = Array.from({ length: 15 }, (_, i) => ({
      id: `r${i}`,
      lat: 35.63 + rand() * 0.1,
      lng: 139.68 + rand() * 0.12,
    }));

    const matrix = buildHaversineMatrix(points);
    const started = Date.now();
    const result = optimizeRoute(points, matrix, { startIndex: 0, endIndex: 14 });
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(1000);
    expect(result.order).toHaveLength(15);
    expect(new Set(result.order).size).toBe(15);
    expect(result.order[0]).toBe(0);
    expect(result.order[14]).toBe(14);
    expect(result.totalDistance).toBeLessThan(result.originalDistance);
  });

  it('区間（legs）の合計が総距離と一致する', () => {
    const matrix = buildHaversineMatrix(ZIGZAG);
    const result = optimizeRoute(ZIGZAG, matrix);
    const sum = result.legs.reduce((s, l) => s + l.distance, 0);
    expect(sum).toBeCloseTo(result.totalDistance, 6);
    expect(result.legs).toHaveLength(ZIGZAG.length - 1);
  });
});

describe('nearestNeighborOrder / twoOptImprove', () => {
  it('最近傍法は開始地点から始まる', () => {
    const matrix = buildHaversineMatrix(ZIGZAG);
    const order = nearestNeighborOrder(matrix.distances, [1, 2, 3, 4, 5], 0, null);
    expect(order[0]).toBe(0);
    expect(order).toHaveLength(6);
  });

  it('2-optは固定端を動かさずにコストを下げる', () => {
    const matrix = buildHaversineMatrix(ZIGZAG);
    const initial = [0, 3, 1, 4, 2, 5];
    const before = pathCost(initial, matrix.distances);
    const { order } = twoOptImprove(initial, matrix.distances, { fixStart: true, fixEnd: true });
    expect(order[0]).toBe(0);
    expect(order[order.length - 1]).toBe(5);
    expect(pathCost(order, matrix.distances)).toBeLessThan(before);
  });
});
