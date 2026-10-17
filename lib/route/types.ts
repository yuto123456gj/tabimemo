export interface RoutePoint {
  id: string;
  lat: number;
  lng: number;
  name?: string;
}

export interface DistanceMatrix {
  /** distances[i][j] = i から j への距離（メートル） */
  distances: number[][];
  /** durations[i][j] = i から j への所要時間（秒） */
  durations: number[][];
  /** 道路距離(osrm) か 直線距離(haversine) か */
  source: 'osrm' | 'haversine';
  /** 直線距離にフォールバックした理由 */
  note?: string;
}

export interface OptimizeOptions {
  /** 開始地点として固定するインデックス（例: ホテル） */
  startIndex?: number | null;
  /** 終了地点として固定するインデックス（例: 空港） */
  endIndex?: number | null;
  /** 最小化する指標。既定は距離 */
  metric?: 'distance' | 'duration';
  /** 2-opt の打ち切り（ミリ秒）。既定 800ms */
  timeBudgetMs?: number;
}

export interface RouteLeg {
  fromIndex: number;
  toIndex: number;
  distance: number;
  duration: number;
}

export interface OptimizeResult {
  /** 並べ替え後の順番（元のインデックスの配列） */
  order: number[];
  totalDistance: number;
  totalDuration: number;
  legs: RouteLeg[];
  /** 並べ替え前の総距離（UIで「どれだけ短くなったか」を見せる） */
  originalDistance: number;
  originalDuration: number;
  improvedBy: number;
  iterations: number;
}
