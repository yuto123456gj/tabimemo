'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env, isSupabaseConfigured } from '@/lib/env';
import { fail, succeed, type ActionResult } from './types';

async function originUrl() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return host ? `${proto}://${host}` : env.siteUrl;
}

/** メールのマジックリンクを送る */
export async function signInWithMagicLink(formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return fail('Supabaseが未設定です。README の手順で .env.local を設定してください。');

  const email = String(formData.get('email') ?? '').trim();
  const next = String(formData.get('next') ?? '/');
  if (!email || !email.includes('@')) return fail('メールアドレスを入力してください。');

  const supabase = await createSupabaseServerClient();
  const origin = await originUrl();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return fail(error.message);
  return succeed();
}

/** Googleログイン（OAuth） */
export async function signInWithGoogle(formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return fail('Supabaseが未設定です。README の手順で .env.local を設定してください。');

  const next = String(formData.get('next') ?? '/');
  const supabase = await createSupabaseServerClient();
  const origin = await originUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) return fail(error.message);
  if (data.url) redirect(data.url);
  return fail('Googleログインを開始できませんでした。');
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect('/');
}
