import { DETOUR_FACTOR, estimateDuration, haversineDistance } from './geo';
import type {
  DistanceMatrix,
  OptimizeOptions,
  OptimizeResult,
  RouteLeg,
  RoutePoint,
} from './types';

/**
 * ルート最適化（純粋関数）。
 * 1. 距離行列を作る（OSRM の道路距離、失敗時はハーバサイン）
 * 2. 最近傍法で初期解を作る
 * 3. 2-opt で改善する
 *
 * 15地点程度までは1秒以内に収まる（実測: 15地点で数ms）。
 */

/** 直線距離だけで距離行列を作る（OSRM が使えない時のフォールバック） */
export function buildHaversineMatrix(
  points: RoutePoint[],
  mode: 'walk' | 'car' = 'walk',
): DistanceMatrix {
  const n = points.length;
  const distances: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const durations: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (i === j) continue;
      const straight = haversineDistance(points[i], points[j]);
      const d = straight * DETOUR_FACTOR;
      distances[i][j] = d;
      durations[i][j] = estimateDuration(d, mode);
    }
  }
  return { distances, durations, source: 'haversine' };
}

function matrixFor(matrix: DistanceMatrix, metric: 'distance' | 'duration') {
  return metric === 'duration' ? matrix.durations : matrix.distances;
}

/** 順番どおりに辿った時のコスト合計 */
export function pathCost(order: number[], cost: number[][]): number {
  let total = 0;
  for (let i = 0; i < order.length - 1; i += 1) {
    const row = cost[order[i]];
    total += row?.[order[i + 1]] ?? 0;
  }
  return total;
}

/** 最近傍法で初期解を作る */
export function nearestNeighborOrder(
  cost: number[][],
  movable: number[],
  startIndex: number | null,
  endIndex: number | null,
): number[] {
  const remaining = new Set(movable);
  const order: number[] = [];

  let current = startIndex;
  if (current !== null) {
    order.push(current);
  } else {
    // 開始が固定でない場合は、終了地点から最も遠い点から始める
    const first =
      endIndex !== null
        ? [...remaining].sort((a, b) => (cost[b][endIndex] ?? 0) - (cost[a][endIndex] ?? 0))[0]
        : [...remaining][0];
    if (first === undefined) {
      return endIndex !== null ? [endIndex] : [];
    }
    remaining.delete(first);
    order.push(first);
    current = first;
  }

  while (remaining.size > 0) {
    let best: number | null = null;
    let bestCost = Infinity;
    for (const candidate of remaining) {
      const c = cost[current as number]?.[candidate] ?? Infinity;
      if (c < bestCost) {
        bestCost = c;
        best = candidate;
      }
    }
    if (best === null) break;
    remaining.delete(best);
    order.push(best);
    current = best;
  }

  if (endIndex !== null) order.push(endIndex);
  return order;
}

/**
 * 2-opt による改善。固定された開始・終了地点は動かさない。
 * 地点数が少ないので、各入れ替えごとに総コストを数え直す素直な実装にしている。
 */
export function twoOptImprove(
  order: number[],
  cost: number[][],
  options: { fixStart: boolean; fixEnd: boolean; timeBudgetMs?: number } = {
    fixStart: false,
    fixEnd: false,
  },
): { order: number[]; iterations: number } {
  const deadline = Date.now() + (options.timeBudgetMs ?? 800);
  const lo = options.fixStart ? 1 : 0;
  const hi = options.fixEnd ? order.length - 2 : order.length - 1;

  let best = [...order];
  let bestCost = pathCost(best, cost);
  let iterations = 0;
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = lo; i < hi; i += 1) {
      for (let j = i + 1; j <= hi; j += 1) {
        iterations += 1;
        const candidate = [...best];
        // i..j を反転（経路の一部をひっくり返す）
        const segment = candidate.slice(i, j + 1).reverse();
        candidate.splice(i, segment.length, ...segment);
        const candidateCost = pathCost(candidate, cost);
        if (candidateCost < bestCost - 1e-9) {
          best = candidate;
          bestCost = candidateCost;
          improved = true;
        }
      }
      if (Date.now() > deadline) return { order: best, iterations };
    }
    if (Date.now() > deadline) break;
  }

  return { order: best, iterations };
}

/** しおりの1日分を最短ルートに並べ替える */
export function optimizeRoute(
  points: RoutePoint[],
  matrix: DistanceMatrix,
  options: OptimizeOptions = {},
): OptimizeResult {
  const metric = options.metric ?? 'distance';
  const cost = matrixFor(matrix, metric);
  const n = points.length;

  const originalOrder = points.map((_, i) => i);
  const originalDistance = pathCost(originalOrder, matrix.distances);
  const originalDuration = pathCost(originalOrder, matrix.durations);

  const buildResult = (order: number[], iterations: number): OptimizeResult => {
    const legs: RouteLeg[] = [];
    for (let i = 0; i < order.length - 1; i += 1) {
      const from = order[i];
      const to = order[i + 1];
      legs.push({
        fromIndex: from,
        toIndex: to,
        distance: matrix.distances[from]?.[to] ?? 0,
        duration: matrix.durations[from]?.[to] ?? 0,
      });
    }
    const totalDistance = legs.reduce((s, l) => s + l.distance, 0);
    const totalDuration = legs.reduce((s, l) => s + l.duration, 0);
    return {
      order,
      totalDistance,
      totalDuration,
      legs,
      originalDistance,
      originalDuration,
      improvedBy: Math.max(0, originalDistance - totalDistance),
      iterations,
    };
  };

  if (n <= 2) return buildResult(originalOrder, 0);

  // 固定インデックスの正規化
  const startIndex =
    options.startIndex !== undefined && options.startIndex !== null && options.startIndex >= 0 && options.startIndex < n
      ? options.startIndex
      : null;
  const endIndex =
    options.endIndex !== undefined && options.endIndex !== null && options.endIndex >= 0 && options.endIndex < n
      ? options.endIndex
      : null;
  // 開始と終了が同じ地点を指していたら終了の固定は無視する（1地点を2回使えないため）
  const effectiveEnd = endIndex !== null && endIndex === startIndex ? null : endIndex;

  const movable = originalOrder.filter((i) => i !== startIndex && i !== effectiveEnd);

  const initial = nearestNeighborOrder(cost, movable, startIndex, effectiveEnd);
  const { order, iterations } = twoOptImprove(initial, cost, {
    fixStart: startIndex !== null,
    fixEnd: effectiveEnd !== null,
    timeBudgetMs: options.timeBudgetMs,
  });

  // 念のため、改善できていなければ元の順番を返す（提案が悪化しないようにする）
  const optimized = buildResult(order, iterations);
  if (optimized.totalDistance > originalDistance + 1e-9 && metric === 'distance') {
    return buildResult(originalOrder, iterations);
  }
  return optimized;
}
