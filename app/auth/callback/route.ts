import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
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

    return NextResponse.redirect(`${origin}${next}`);
  }

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'magiclink' | 'email' | 'signup' | 'recovery' | 'invite',
      token_hash: tokenHash,
    });
    if (error) return failTo(friendlyMessage(error.message));

    return NextResponse.redirect(`${origin}${next}`);
  }

  return failTo('ログイン情報を確認できませんでした。もう一度お試しください。');
}
