import { buildHaversineMatrix } from '@/lib/route/optimize';
import type { DistanceMatrix, MatrixProvider, RoutePoint } from './types';

/** 直線距離（ハーバサイン）の行列。外部通信なしで必ず成功する。 */
export const haversineProvider: MatrixProvider = {
  id: 'haversine',
  label: '直線距離（オフライン）',
  async buildMatrix(points: RoutePoint[], mode: 'walk' | 'car'): Promise<DistanceMatrix> {
    return buildHaversineMatrix(points, mode);
  },
};
