import type { Metadata } from 'next';
import Link from 'next/link';
import { AcceptInvite } from '@/components/layout/AcceptInvite';
import { Notice } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';
import { APP_NAME_JA } from '@/lib/constants';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/data/session';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata: Metadata = { title: 'グループへの招待' };

const REASONS: Record<string, string> = {
  NOT_FOUND: 'この招待リンクは見つかりませんでした。URLを確認してください。',
  REVOKED: 'この招待リンクは無効化されています。招待した人に新しいリンクをお願いしてください。',
  EXPIRED: 'この招待リンクは有効期限が切れています。新しいリンクをお願いしてください。',
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();

  let groupName: string | null = null;
  let valid = false;
  let reason: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc('peek_group_invite', { invite_token: token });
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      groupName = (row.group_name as string | null) ?? null;
      valid = Boolean(row.valid);
      reason = (row.reason as string | null) ?? null;
    } else {
      reason = 'NOT_FOUND';
    }
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
        <div className="card animate-fade-up p-6 text-center">
          {!isSupabaseConfigured() ? (
            <Notice tone="warn">Supabase が未設定のため、招待を受け取れません。</Notice>
          ) : !valid ? (
            <>
              <h1 className="text-lg font-extrabold text-ink-900 dark:text-white">招待を使えませんでした</h1>
              <Notice tone="error" className="mt-4 text-left">
                {REASONS[reason ?? 'NOT_FOUND'] ?? REASONS.NOT_FOUND}
              </Notice>
              <ButtonLink href="/" variant="outline" className="mt-5">
                トップへ戻る
              </ButtonLink>
            </>
          ) : (
            <>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-2xl text-white">
                🎉
              </span>
              <h1 className="mt-4 text-lg font-extrabold text-ink-900 dark:text-white">
                「{groupName}」に招待されています
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
                参加すると、みんなで保存した行きたい場所と旅のしおりを一緒に編集できます。
              </p>

              <div className="mt-6">
                {user ? (
                  <AcceptInvite token={token} groupName={groupName ?? 'グループ'} />
                ) : (
                  <>
                    <ButtonLink href={`/invite/${token}/join`} size="lg" className="w-full">
                      ログインして参加する
                    </ButtonLink>
                    <p className="mt-3 text-xs leading-relaxed text-ink-400">
                      ログイン後、自動でこの画面に戻ってきます。
                      <br />
                      <strong className="text-ink-600 dark:text-ink-300">
                        「Googleでログイン」がいちばん簡単です。
                      </strong>
                      <br />
                      メールを使う場合、届いたリンクは必ず同じブラウザで開いてください。
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
