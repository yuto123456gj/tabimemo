'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabaseCredentials } from '@/lib/env';

let cached: ReturnType<typeof createBrowserClient> | null = null;

/** ブラウザ用クライアント（anon key のみ。シークレットは含まない） */
export function createClient() {
  if (cached) return cached;
  const { url, key } = supabaseCredentials();
  cached = createBrowserClient(url, key);
  return cached;
}
