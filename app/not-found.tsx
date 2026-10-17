import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { APP_NAME_JA } from '@/lib/constants';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-sky-gradient px-6 text-center dark:bg-ink-950">
      <div className="max-w-sm">
        <svg width="140" height="110" viewBox="0 0 140 110" fill="none" aria-hidden="true" className="mx-auto">
          <path
            d="M34 26 58 19l26 8 24-7v62l-24 7-26-8-24 7V26Z"
            className="fill-brand-100 stroke-brand-400 dark:fill-brand-900/40 dark:stroke-brand-500"
            strokeWidth="2"
          />
          <path d="M58 19v62M84 27v62" className="stroke-brand-400 dark:stroke-brand-500" strokeWidth="2" strokeDasharray="4 5" />
          <path d="M62 52h20M72 42v20" className="stroke-accent-400" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <h1 className="mt-4 text-xl font-extrabold text-ink-900 dark:text-white">ページが見つかりません</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
          URLが変わったか、削除されたかもしれません。共有リンクの場合は、送ってくれた人に確認してみてください。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/">ホームへ戻る</ButtonLink>
          <Link href="/places" className="chip">
            スポット一覧
          </Link>
        </div>
        <p className="mt-8 text-xs text-ink-400">{APP_NAME_JA}</p>
      </div>
    </div>
  );
}
