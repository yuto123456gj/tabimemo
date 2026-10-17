'use client';

import { useState, useTransition } from 'react';
import { signInWithGoogle, signInWithMagicLink } from '@/lib/actions/auth';
import { Button } from '@/components/ui/Button';
import { Notice, Spinner } from '@/components/ui/Feedback';

export function LoginForm({ next = '/' }: { next?: string }) {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleMagicLink = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await signInWithMagicLink(formData);
      if (result.ok) {
        setSent(String(formData.get('email') ?? ''));
      } else {
        setError(result.error ?? 'ログインリンクを送れませんでした。');
      }
    });
  };

  const handleGoogle = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await signInWithGoogle(formData);
      // 成功時は redirect されるので、ここに来るのはエラー時だけ
      if (!result.ok) setError(result.error ?? 'Googleログインを開始できませんでした。');
    });
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <Notice tone="success">
          <strong className="block">{sent} にログインリンクを送りました</strong>
          メールを開いてリンクをタップすると、そのままログインできます。
        </Notice>
        <Button variant="ghost" onClick={() => setSent(null)} className="w-full">
          別のメールアドレスを使う
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <Notice tone="error">{error}</Notice>}

      <form action={handleGoogle}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="outline" size="lg" className="w-full" disabled={pending}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.1H24v7.8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.5-5.5C33.9 6.1 29.2 4 24 4 13 4 4 13 4 24s9 20 20 20c11 0 19.3-8 19.3-20 0-1.3-.1-2.6-.7-3.9Z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.4 4.7C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.5-5.5C33.9 6.1 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.8-2 13.3-5.2l-6.1-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-8l-6.4 4.9C9.6 39.6 16.2 44 24 44Z" />
            <path fill="#1976D2" d="M43.6 20.1H24v7.8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.1 5.2c3.6-3.3 6-8.3 6-14.7 0-1.3-.1-2.6-.7-3.9Z" />
          </svg>
          Googleでログイン
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-ink-400">
        <span className="h-px flex-1 bg-ink-200 dark:bg-ink-700" />
        または
        <span className="h-px flex-1 bg-ink-200 dark:bg-ink-700" />
      </div>

      <form action={handleMagicLink} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="label" htmlFor="email">
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="input"
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Spinner /> : 'ログインリンクを送る'}
        </Button>
        <p className="text-xs leading-relaxed text-ink-500 dark:text-ink-400">
          パスワードは不要です。届いたメールのリンクをタップするだけでログインできます。
        </p>
      </form>
    </div>
  );
}
