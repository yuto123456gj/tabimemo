import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

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
    if (error) return failTo(error.message);
    return NextResponse.redirect(`${origin}${next}`);
  }

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'magiclink' | 'email' | 'signup' | 'recovery' | 'invite',
      token_hash: tokenHash,
    });
    if (error) return failTo(error.message);
    return NextResponse.redirect(`${origin}${next}`);
  }

  return failTo('ログイン情報を確認できませんでした。もう一度お試しください。');
}
