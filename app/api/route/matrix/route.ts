import { NextResponse, type NextRequest } from 'next/server';
import { buildDistanceMatrix } from '@/lib/providers/routing';
import { optimizeRoute } from '@/lib/route/optimize';
import type { RoutePoint } from '@/lib/route/types';
import { clientKey, takeToken } from '@/lib/utils/ratelimit';
import { getCurrentUser } from '@/lib/data/session';
import { isSupabaseConfigured } from '@/lib/env';

interface Body {
  points?: RoutePoint[];
  mode?: 'walk' | 'car';
  startIndex?: number | null;
  endIndex?: number | null;
  metric?: 'distance' | 'duration';
}

/**
 * 距離行列を作ってルートを最適化する。
 * OSRM の呼び出しはサーバー側だけで行う。
 */
export async function POST(request: NextRequest) {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
  }

  if (!takeToken(`matrix:${clientKey(request)}`, 20, 0.4)) {
    return NextResponse.json({ error: '少し待ってからもう一度お試しください。' }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'リクエストを読めませんでした。' }, { status: 400 });
  }

  const points = (body.points ?? []).filter(
    (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && typeof p.id === 'string',
  );

  if (points.length < 2) {
    return NextResponse.json({ error: '並べ替えるには2件以上のスポットが必要です。' }, { status: 400 });
  }
  if (points.length > 25) {
    return NextResponse.json({ error: '一度に並べ替えられるのは25件までです。' }, { status: 400 });
  }

  const mode = body.mode === 'car' ? 'car' : 'walk';
  const matrix = await buildDistanceMatrix(points, mode);

  const result = optimizeRoute(points, matrix, {
    startIndex: body.startIndex ?? null,
    endIndex: body.endIndex ?? null,
    metric: body.metric ?? 'distance',
    timeBudgetMs: 800,
  });

  return NextResponse.json({
    ...result,
    source: matrix.source,
    note: matrix.note,
    mode,
    orderedIds: result.order.map((i) => points[i].id),
  });
}
