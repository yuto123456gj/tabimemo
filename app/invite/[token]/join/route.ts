import { NextResponse, type NextRequest } from 'next/server';
import { PENDING_INVITE_COOKIE } from '@/lib/data/session';

/**
 * 招待リンクからログインへ向かう入口。
 *
 * OAuth（Google）の行き帰りでクエリパラメータが失われることがあるため、
 * 「どの招待に参加しようとしているか」をCookieに退避してからログインへ送る。
 * ログイン完了後、/auth/callback がこのCookieを見て自動的に参加させる。
 */
export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const { origin } = request.nextUrl;

  const response = NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  response.cookies.set(PENDING_INVITE_COOKIE, token, {
    path: '/',
    maxAge: 60 * 60, // 1時間だけ覚えておく
    sameSite: 'lax',
    httpOnly: true,
  });

  return response;
}
