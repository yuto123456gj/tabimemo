import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured, supabaseCredentials } from '@/lib/env';

/** ログイン必須のパス（prefix 一致） */
const PROTECTED_PREFIXES = ['/places', '/trips', '/groups', '/settings'];
/** ログイン不要のパス */
const PUBLIC_PREFIXES = ['/', '/login', '/auth', '/s/', '/api/health'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) return response;

  const { url, key } = supabaseCredentials();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // セッションのリフレッシュ（この呼び出し自体が重要）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isPublic = PUBLIC_PREFIXES.some((p) => (p === '/' ? pathname === '/' : pathname.startsWith(p)));

  if (!user && needsAuth && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
