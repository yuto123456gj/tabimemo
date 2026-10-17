import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseCredentials } from '@/lib/env';

/**
 * Server Component / Server Action / Route Handler 用クライアント。
 * Server Component からは Cookie を書き込めないため、set は try/catch で無視する。
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseCredentials();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component からの呼び出し。middleware 側でセッションを更新する。
        }
      },
    },
  });
}
