import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * service role キーを使う管理用クライアント。
 * シードスクリプトなどサーバー側専用。絶対にクライアントへ import しない。
 */
export function createAdminClient() {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY と NEXT_PUBLIC_SUPABASE_URL が必要です（.env.local を確認してください）',
    );
  }
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
