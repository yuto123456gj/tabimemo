import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';

/**
 * Google Places の写真を中継する。
 * APIキーをクライアントに出さないため、実URLはサーバー側で解決してリダイレクトする。
 */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name');
  if (!name || !name.startsWith('places/')) {
    return NextResponse.json({ error: '写真の指定が不正です。' }, { status: 400 });
  }
  if (!env.googlePlacesKey) {
    return NextResponse.json({ error: 'Google Places API キーが未設定です。' }, { status: 404 });
  }

  const maxWidth = Math.min(Number(request.nextUrl.searchParams.get('w') ?? 800) || 800, 1600);
  const url = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidth}&skipHttpRedirect=true&key=${env.googlePlacesKey}`;

  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return NextResponse.json({ error: '写真を取得できませんでした。' }, { status: 502 });
    const json = (await res.json()) as { photoUri?: string };
    if (!json.photoUri) return NextResponse.json({ error: '写真が見つかりませんでした。' }, { status: 404 });
    return NextResponse.redirect(json.photoUri, { status: 307 });
  } catch {
    return NextResponse.json({ error: '写真の取得に失敗しました。' }, { status: 502 });
  }
}
