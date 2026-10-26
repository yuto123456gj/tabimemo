import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ACTIVE_GROUP_COOKIE, PENDING_INVITE_COOKIE } from '@/lib/data/session';

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * ログイン前に招待リンクを踏んでいたら、ここで自動的に参加させる。
 * OAuthの行き帰りでクエリが失われても確実に参加できるようにするため。
 */
async function acceptPendingInvite(
  supabase: Supabase,
  request: NextRequest,
  response: NextResponse,
): Promise<void> {
  const token = request.cookies.get(PENDING_INVITE_COOKIE)?.value;
  if (!token) return;

  // 成否にかかわらず、この招待Cookieは使い切る
  response.cookies.set(PENDING_INVITE_COOKIE, '', { path: '/', maxAge: 0 });

  const { data, error } = await supabase.rpc('accept_group_invite', { invite_token: token });
  if (error) {
    // 失敗を黙って握りつぶすと「なぜか入れない」状態になるので画面にも出す
    console.error('[auth/callback] 招待の自動参加に失敗しました:', error.message);
    response.cookies.set('tabimemo_invite_error', error.message.slice(0, 200), {
      path: '/',
      maxAge: 60,
      sameSite: 'lax',
    });
    return;
  }

  const row = (Array.isArray(data) ? data[0] : data) as { group_id?: string } | null;
  if (row?.group_id) {
    // 参加したグループをそのまま表示対象にする
    response.cookies.set(ACTIVE_GROUP_COOKIE, row.group_id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }
}

/**
 * Supabaseからの英語エラーを、原因と対処が分かる日本語にする。
 *
 * とくに多いのが「メールを送ったブラウザと、リンクを開いたブラウザが違う」ケース。
 * ログインの合言葉は送信したブラウザにだけ保存されるため、
 * Gmailアプリ内のブラウザで開くと失敗する。
 */
function friendlyMessage(raw: string): string {
  const lower = raw.toLowerCase();

  if (lower.includes('code verifier') || lower.includes('code challenge') || lower.includes('pkce')) {
    return 'ログインリンクを、メールアドレスを入力したときと同じブラウザで開く必要があります。お手数ですが、リンクを長押ししてURLをコピーし、最初に入力したブラウザのアドレス欄に貼り付けて開いてください。「Googleでログイン」ならこの操作は不要です。';
  }
  if (lower.includes('expired') || lower.includes('invalid') || lower.includes('not found')) {
    return 'このログインリンクは期限切れか、すでに使用済みです。お手数ですが、もう一度ログインリンクを送ってください（リンクは1回しか使えません）。';
  }
  if (lower.includes('rate limit')) {
    return 'ログインメールの送信回数の上限に達しました。1時間ほど待つか、「Googleでログイン」をお試しください。';
  }
  return raw;
}

/**
 * 認証後のリダイレクト先。
 * - OAuth / PKCE: ?code=...
 * - メールのマジックリンク: ?token_hash=...&type=magiclink
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const nextParam = searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/';

  const failTo = (message: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);

  if (!isSupabaseConfigured()) return failTo('Supabaseが未設定です。');

  const errorDescription = searchParams.get('error_description');
  if (errorDescription) return failTo(errorDescription);

  const supabase = await createSupabaseServerClient();

  const code = searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failTo(friendlyMessage(error.message));

    const response = NextResponse.redirect(`${origin}${next}`);
    await acceptPendingInvite(supabase, request, response);
    return response;
  }

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'magiclink' | 'email' | 'signup' | 'recovery' | 'invite',
      token_hash: tokenHash,
    });
    if (error) return failTo(friendlyMessage(error.message));

    const response = NextResponse.redirect(`${origin}${next}`);
    await acceptPendingInvite(supabase, request, response);
    return response;
  }

  return failTo('ログイン情報を確認できませんでした。もう一度お試しください。');
}
