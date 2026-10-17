import { ButtonLink } from '@/components/ui/Button';
import { APP_DESCRIPTION, APP_NAME, APP_NAME_JA, APP_TAGLINE } from '@/lib/constants';
import { ThemeToggle } from './ThemeToggle';
import { IconBook, IconPin, IconRoute, IconUsers } from '@/components/ui/Icons';

const FEATURES = [
  {
    Icon: IconPin,
    title: '行きたい場所を貯める',
    body: '店名を検索して保存。SNSの投稿を貼り付ければ、店名とエリアを読み取って候補を出します。Googleマップの保存済みリストもまとめて取り込めます。',
  },
  {
    Icon: IconBook,
    title: 'そのまま旅のしおりへ',
    body: '貯めたスポットを選ぶだけで日程表に。到着時刻・滞在時間・移動手段を入れて、持ち物や予算も1か所に。',
  },
  {
    Icon: IconRoute,
    title: '最短ルートを自動で',
    body: '1日分の立ち寄り順を自動で組み直します。ホテル発・空港着の固定もでき、そのままGoogleマップで開けます。',
  },
  {
    Icon: IconUsers,
    title: '二人以上で共有',
    body: '招待リンクを送るだけ。誰かが追加するともう一方の画面にすぐ反映され、感想や評価は人ごとに残せます。',
  },
];

const STEPS = [
  { n: '1', title: '保存する', body: '気になったお店・景色をどんどん貯める' },
  { n: '2', title: '組み立てる', body: '旅行を作って、保存したスポットを日程に入れる' },
  { n: '3', title: '出かける', body: '最短ルートで回って、感想を残す' },
];

export function Landing() {
  return (
    <div className="min-h-dvh bg-sky-gradient dark:bg-ink-950">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <div className="flex items-center gap-2 font-extrabold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white shadow-sm">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s6-6 6-10.5A6 6 0 0 0 6 10.5C6 15 12 21 12 21Z" />
              <circle cx="12" cy="10.2" r="2" />
            </svg>
          </span>
          <span className="text-lg tracking-tight">{APP_NAME_JA}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ButtonLink href="/login" size="sm">
            はじめる
          </ButtonLink>
        </div>
      </header>

      {/* ヒーロー */}
      <section className="mx-auto max-w-5xl px-5 pb-10 pt-6 md:pt-14">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="animate-fade-up">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-pill bg-white/80 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm dark:bg-ink-900 dark:text-brand-300">
              保存して終わらない、旅のメモ
            </p>
            <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-ink-900 md:text-5xl dark:text-white">
              {APP_TAGLINE}
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-600 md:text-base dark:text-ink-300">
              {APP_DESCRIPTION}
              <br className="hidden md:block" />
              カップル・友だち・家族で、ひとつのリストを一緒に育てられます。
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ButtonLink href="/login" size="lg">
                無料ではじめる
              </ButtonLink>
              <span className="text-xs text-ink-500 dark:text-ink-400">
                メールアドレスかGoogleアカウントで、すぐ使えます
              </span>
            </div>
          </div>

          {/* スマホ画面のモック（画像を使わず自前で描く） */}
          <div className="relative mx-auto w-full max-w-[300px] animate-pop-in">
            <div className="rounded-[2.2rem] border border-ink-200/70 bg-white p-3 shadow-card dark:border-ink-700 dark:bg-ink-900">
              <div className="rounded-[1.6rem] bg-sky-gradient p-3 dark:bg-ink-950">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-ink-700 dark:text-ink-200">京都 2泊3日</span>
                  <span className="rounded-pill bg-brand-500 px-2 py-0.5 text-[9px] font-bold text-white">
                    ルート最適化
                  </span>
                </div>
                {[
                  { t: '9:30', n: '伏見稲荷大社', d: '1.2km・15分' },
                  { t: '11:30', n: '喫茶ソワレ', d: '0.4km・6分' },
                  { t: '14:00', n: '清水寺', d: '2.1km・26分' },
                  { t: '17:30', n: '祇園 花見小路', d: 'ゴール' },
                ].map((row, i) => (
                  <div key={row.n} className="mb-1.5 flex items-center gap-2.5 rounded-xl bg-white/90 px-2.5 py-2 dark:bg-ink-900">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-bold text-ink-800 dark:text-ink-100">{row.n}</span>
                      <span className="block text-[9px] text-ink-400">{row.t}・{row.d}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3ステップ */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <h2 className="mb-6 text-center text-xl font-extrabold text-ink-900 dark:text-white">使い方は3ステップ</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="card p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-100 text-sm font-extrabold text-accent-700 dark:bg-accent-900/50 dark:text-accent-200">
                {s.n}
              </span>
              <h3 className="mt-3 font-bold text-ink-900 dark:text-ink-50">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 機能 */}
      <section className="mx-auto max-w-5xl px-5 py-6">
        <div className="grid gap-4 md:grid-cols-2">
          {FEATURES.map(({ Icon, title, body }) => (
            <div key={title} className="card flex gap-4 p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                <Icon width={22} height={22} />
              </span>
              <div>
                <h3 className="font-bold text-ink-900 dark:text-ink-50">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12 text-center">
        <div className="rounded-card bg-brand-gradient px-6 py-10 text-white shadow-lift">
          <h2 className="text-2xl font-extrabold">次の旅、どこに行く？</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/90">
            まずは1件、行きたい場所を保存してみてください。しおりとルートは、あとから勝手についてきます。
          </p>
          <ButtonLink href="/login" variant="outline" size="lg" className="mt-6 border-transparent bg-white text-brand-600 hover:text-brand-700">
            はじめる
          </ButtonLink>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-8 text-center text-xs text-ink-400 dark:border-ink-800">
        <p>
          {APP_NAME_JA}（{APP_NAME}）
        </p>
        <p className="mt-1">
          地図データ © OpenStreetMap contributors / 経路計算 OSRM
        </p>
      </footer>
    </div>
  );
}
