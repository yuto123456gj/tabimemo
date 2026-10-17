import { NextResponse, type NextRequest } from 'next/server';
import { extractSpots } from '@/lib/providers/extract';
import { searchPlaces } from '@/lib/providers/places';
import { clientKey, takeToken } from '@/lib/utils/ratelimit';
import { getCurrentUser } from '@/lib/data/session';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * SNS投稿のテキストから場所を抽出し、そのまま場所検索の候補（最大3件）を返す。
 *
 * InstagramやTikTokのページは取得しない。ユーザーが貼ったテキスト／URLだけを使う。
 */
export async function POST(request: NextRequest) {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
  }

  if (!takeToken(`extract:${clientKey(request)}`, 15, 0.2)) {
    return NextResponse.json({ error: '少し待ってからもう一度お試しください。' }, { status: 429 });
  }

  let body: { text?: string };
  try {
    body = (await request.json()) as { text?: string };
  } catch {
    return NextResponse.json({ error: 'リクエストを読めませんでした。' }, { status: 400 });
  }

  const text = (body.text ?? '').trim();
  if (!text) return NextResponse.json({ error: 'テキストを貼り付けてください。' }, { status: 400 });
  if (text.length > 8000) {
    return NextResponse.json({ error: 'テキストが長すぎます（8000文字まで）。' }, { status: 413 });
  }

  const extracted = await extractSpots(text);

  /**
   * 確信度の高い順に検索する。
   * 「店名 エリア」で見つからないことは珍しくないので、見つかるまで
   * 「店名だけ」「次の候補」と段階的に試す（Nominatimの負荷を考えて最大3回）。
   */
  // 「喫茶ソワレ」が地図上は「ソワレ」で登録されている、といったズレを吸収する
  const BUSINESS_PREFIX = /^(喫茶|カフェ|居酒屋|レストラン|食堂|ラーメン|焼肉|寿司|鮨|バー|ホテル|旅館)\s*/;

  const attempts: string[] = [];
  for (const spot of extracted.spots) {
    if (spot.query) attempts.push(spot.query);
    // エリアを外した店名だけでも試す
    if (spot.name && spot.name !== spot.query) attempts.push(spot.name);
    // 業態の接頭辞を外した名前でも試す
    const stripped = spot.name?.replace(BUSINESS_PREFIX, '').trim();
    if (stripped && stripped.length >= 2 && stripped !== spot.name) {
      if (spot.area) attempts.push(`${stripped} ${spot.area}`);
      attempts.push(stripped);
    }
  }
  const queries = Array.from(new Set(attempts)).slice(0, 5);

  let candidates: Awaited<ReturnType<typeof searchPlaces>>['candidates'] = [];
  let searchProvider: string | null = null;
  let searchNote: string | undefined;
  let matchedQuery: string | null = null;

  for (const query of queries) {
    try {
      const result = await searchPlaces(query, { limit: 3 });
      if (result.candidates.length > 0) {
        candidates = result.candidates.slice(0, 3);
        searchProvider = result.provider;
        searchNote = result.fallbackReason;
        matchedQuery = query;
        break;
      }
    } catch (error) {
      searchNote = error instanceof Error ? error.message : '場所検索に失敗しました';
    }
  }

  if (candidates.length === 0 && queries.length > 0 && !searchNote) {
    searchNote = `「${queries.join('」「')}」で探しましたが見つかりませんでした。キーワードを押して再検索するか、検索タブから探してください。`;
  }

  return NextResponse.json({
    ...extracted,
    candidates,
    searchProvider,
    searchNote,
    matchedQuery,
  });
}
