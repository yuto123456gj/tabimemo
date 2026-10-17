import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export type AuthContext =
  | { ok: true; supabase: SupabaseClient; user: User }
  | { ok: false; error: string };

/** Server Action の先頭で呼ぶ共通ガード。 */
export async function requireUser(): Promise<AuthContext> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabaseが未設定です。README の手順で .env.local を設定してください。' };
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'ログインが必要です。' };
  return { ok: true, supabase, user };
}
