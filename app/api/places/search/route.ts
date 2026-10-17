import { NextResponse, type NextRequest } from 'next/server';
import { searchPlaces } from '@/lib/providers/places';
import { clientKey, takeToken } from '@/lib/utils/ratelimit';
import { getCurrentUser } from '@/lib/data/session';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * 場所検索。外部APIの呼び出しはすべてここ（サーバー側）で行い、
 * APIキーはクライアントに出さない。
 */
export async function GET(request: NextRequest) {
  // 未ログインからの乱用を防ぐ（Supabase未設定時は開発中とみなして通す）
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
  }

  if (!takeToken(`search:${clientKey(request)}`, 30, 0.5)) {
    return NextResponse.json({ error: '検索が続いています。少し待ってからお試しください。' }, { status: 429 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ provider: 'none', candidates: [] });
  }

  const latRaw = request.nextUrl.searchParams.get('lat');
  const lngRaw = request.nextUrl.searchParams.get('lng');
  const near =
    latRaw && lngRaw && Number.isFinite(Number(latRaw)) && Number.isFinite(Number(lngRaw))
      ? { lat: Number(latRaw), lng: Number(lngRaw) }
      : null;

  try {
    const result = await searchPlaces(q, { near, limit: 6 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { provider: 'none', candidates: [], error: error instanceof Error ? error.message : '検索に失敗しました' },
      { status: 502 },
    );
  }
}
