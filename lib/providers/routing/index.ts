import { haversineProvider } from './haversine';
import { osrmProvider } from './osrm';
import type { DistanceMatrix, RoutePoint } from './types';

export { haversineProvider, osrmProvider };
export type { DistanceMatrix, RoutePoint };

/**
 * まず OSRM（道路距離）を試し、失敗したら直線距離にフォールバックする。
 * この関数はサーバー側（Route Handler）から呼ぶ。
 */
export async function buildDistanceMatrix(
  points: RoutePoint[],
  mode: 'walk' | 'car' = 'walk',
): Promise<DistanceMatrix> {
  try {
    return await osrmProvider.buildMatrix(points, mode);
  } catch (error) {
    const matrix = await haversineProvider.buildMatrix(points, mode);
    return {
      ...matrix,
      note: `道路距離が取得できなかったため直線距離で計算しました（${
        error instanceof Error ? error.message : '不明なエラー'
      }）`,
    };
  }
}
