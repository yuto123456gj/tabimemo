'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center bg-sky-gradient px-6 text-center dark:bg-ink-950">
      <div className="max-w-sm">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-100 text-3xl dark:bg-brand-900/40">
          🧭
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-ink-900 dark:text-white">うまく表示できませんでした</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
          一時的な問題かもしれません。もう一度読み込んでみてください。
          続く場合は、通信状況やSupabaseの設定を確認してください。
        </p>
        {error.digest && <p className="mt-2 font-mono text-[11px] text-ink-400">エラーID: {error.digest}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>もう一度読み込む</Button>
          <ButtonLink href="/" variant="outline">
            ホームへ
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
