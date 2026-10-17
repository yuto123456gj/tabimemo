import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/layout/LoginForm';
import { Notice } from '@/components/ui/Feedback';
import { APP_NAME_JA, APP_TAGLINE } from '@/lib/constants';
import { getCurrentUser } from '@/lib/data/session';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata: Metadata = { title: 'ログイン' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith('/') ? params.next : '/';

  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (user) redirect(next);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-sky-gradient px-5 dark:bg-ink-950">
      <header className="flex h-16 items-center">
        <Link href="/" className="flex items-center gap-2 font-extrabold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white shadow-sm">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s6-6 6-10.5A6 6 0 0 0 6 10.5C6 15 12 21 12 21Z" />
              <circle cx="12" cy="10.2" r="2" />
            </svg>
          </span>
          <span className="text-lg">{APP_NAME_JA}</span>
        </Link>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 py-6">
        <div className="card animate-fade-up p-6">
          <h1 className="text-xl font-extrabold text-ink-900 dark:text-white">ログイン / 新規登録</h1>
          <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">{APP_TAGLINE}</p>

          <div className="mt-6 space-y-4">
            {params.error && <Notice tone="error">{decodeURIComponent(params.error)}</Notice>}
            {!isSupabaseConfigured() && (
              <Notice tone="warn">
                Supabase が未設定のため、まだログインできません。README の手順で
                <code className="mx-1 rounded bg-black/5 px-1">.env.local</code>を作成してください。
              </Notice>
            )}
            <LoginForm next={next} />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          初回ログイン時に「わたしの行きたい場所」グループが自動で作られます。
        </p>
      </div>
    </div>
  );
}
