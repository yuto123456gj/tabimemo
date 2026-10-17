import type { DistanceMatrix, RoutePoint } from '@/lib/route/types';

export type { DistanceMatrix, RoutePoint };

export interface MatrixProvider {
  readonly id: 'osrm' | 'haversine';
  readonly label: string;
  /** 距離行列を返す。失敗時は例外を投げる（呼び出し側がフォールバックする） */
  buildMatrix(points: RoutePoint[], mode: 'walk' | 'car'): Promise<DistanceMatrix>;
}
