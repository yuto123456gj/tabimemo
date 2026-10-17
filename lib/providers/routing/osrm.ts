import { AVERAGE_SPEED_MPS } from '@/lib/route/geo';
import type { DistanceMatrix, MatrixProvider, RoutePoint } from './types';

/**
 * OSRM の公開サーバー（router.project-osrm.org）で道路距離の行列を取る。
 *
 * 注意: 公開デモサーバーは car プロファイルのみ提供している。
 * そのため距離は常に car で取得し、徒歩の所要時間は徒歩の平均速度から再計算する。
 */
const BASE = 'https://router.project-osrm.org';
const MAX_POINTS = 25; // デモサーバーへの負荷を考えて上限を設ける
const TIMEOUT_MS = 5000;

interface OsrmTableResponse {
  code: string;
  distances?: (number | null)[][];
  durations?: (number | null)[][];
  message?: string;
}

export const osrmProvider: MatrixProvider = {
  id: 'osrm',
  label: 'OSRM（道路距離）',

  async buildMatrix(points: RoutePoint[], mode: 'walk' | 'car'): Promise<DistanceMatrix> {
    if (points.length < 2) {
      return { distances: [[0]], durations: [[0]], source: 'osrm' };
    }
    if (points.length > MAX_POINTS) {
      throw new Error(`地点が多すぎます（OSRMは${MAX_POINTS}地点まで）`);
    }

    const coords = points.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
    const url = `${BASE}/table/v1/driving/${coords}?annotations=distance,duration`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Tabimemo/0.1' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 300 },
    });

    if (!res.ok) throw new Error(`OSRM error: ${res.status}`);

    const json = (await res.json()) as OsrmTableResponse;
    if (json.code !== 'Ok' || !json.distances || !json.durations) {
      throw new Error(`OSRM error: ${json.message ?? json.code}`);
    }

    const n = points.length;
    const distances: number[][] = [];
    const durations: number[][] = [];

    for (let i = 0; i < n; i += 1) {
      const dRow: number[] = [];
      const tRow: number[] = [];
      for (let j = 0; j < n; j += 1) {
        const dist = json.distances[i]?.[j];
        const dur = json.durations[i]?.[j];
        if (dist === null || dist === undefined || !Number.isFinite(dist)) {
          // 到達できない組み合わせがある行列は信頼できないのでフォールバックさせる
          throw new Error('OSRM が一部の区間を計算できませんでした');
        }
        dRow.push(dist);
        // 徒歩は car の所要時間が使えないので距離から計算する
        tRow.push(
          mode === 'walk'
            ? dist / AVERAGE_SPEED_MPS.walk
            : Number.isFinite(dur as number)
              ? (dur as number)
              : dist / AVERAGE_SPEED_MPS.car,
        );
      }
      distances.push(dRow);
      durations.push(tRow);
    }

    return { distances, durations, source: 'osrm' };
  },
};
