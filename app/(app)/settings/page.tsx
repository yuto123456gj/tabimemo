import type { Metadata } from 'next';
import Link from 'next/link';
import { ProfileSettings } from '@/components/layout/ProfileSettings';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Badge, Card, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconChevronRight, IconUsers } from '@/components/ui/Icons';
import { APP_NAME, APP_NAME_JA } from '@/lib/constants';
import { getActiveGroup, getCurrentUser, getMyGroups, getProfile } from '@/lib/data/session';
import { env, isSupabaseConfigured } from '@/lib/env';

export const metadata: Metadata = { title: '設定' };

export default async function SettingsPage() {
  const [user, profile, groups, activeGroup] = await Promise.all([
    getCurrentUser(),
    getProfile(),
    getMyGroups(),
    getActiveGroup(),
  ]);

  const features = [
    {
      label: '場所検索',
      value: env.googlePlacesKey ? 'Google Places' : 'OpenStreetMap (Nominatim)',
      hint: env.googlePlacesKey
        ? 'GOOGLE_PLACES_API_KEY が設定されています'
        : 'GOOGLE_PLACES_API_KEY を入れると、店名の検索精度と写真が良くなります',
    },
    {
      label: 'SNSからの読み取り',
      value: env.anthropicKey ? 'Claude（AI抽出）' : 'かんたん抽出（ルールベース）',
      hint: env.anthropicKey
        ? 'ANTHROPIC_API_KEY が設定されています'
        : 'ANTHROPIC_API_KEY を入れると、長いキャプションからの店名抽出が賢くなります',
    },
    {
      label: 'ルート計算',
      value: 'OSRM（失敗時は直線距離）',
      hint: 'キーは不要です',
    },
    {
      label: 'データベース',
      value: isSupabaseConfigured() ? 'Supabase 接続中' : '未設定',
      hint: isSupabaseConfigured() ? '' : 'NEXT_PUBLIC_SUPABASE_URL と ANON_KEY を .env.local に設定してください',
    },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold tracking-tight text-ink-900 dark:text-white">設定</h1>

      <section>
        <SectionTitle>プロフィール</SectionTitle>
        <Card className="space-y-4">
          <p className="text-sm text-ink-500 dark:text-ink-400">
            ログイン中: <span className="font-medium text-ink-800 dark:text-ink-100">{user?.email ?? '—'}</span>
          </p>
          <ProfileSettings initialName={profile?.display_name ?? ''} />
        </Card>
      </section>

      <section>
        <SectionTitle>表示</SectionTitle>
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">ダークモード</p>
            <p className="text-xs text-ink-500 dark:text-ink-400">端末の設定に合わせつつ、手動でも切り替えられます</p>
          </div>
          <ThemeToggle className="rounded-pill border border-ink-200 p-2.5 text-ink-600 transition hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800" />
        </Card>
      </section>

      <section>
        <SectionTitle>グループ</SectionTitle>
        <Link href="/groups" className="card flex items-center gap-3 p-4 transition hover:shadow-lift">
          <IconUsers className="text-accent-500" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{activeGroup?.name ?? 'グループがありません'}</span>
            <span className="block text-xs text-ink-500 dark:text-ink-400">
              {groups.length}個のグループ・招待リンクの発行はこちら
            </span>
          </span>
          <IconChevronRight className="text-ink-400" />
        </Link>
      </section>

      <section>
        <SectionTitle>連携状況</SectionTitle>
        <Card>
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {features.map((f) => (
              <li key={f.label} className="flex flex-wrap items-center gap-2 py-2.5 first:pt-0 last:pb-0">
                <span className="w-32 shrink-0 text-sm text-ink-500 dark:text-ink-400">{f.label}</span>
                <Badge tone="brand">{f.value}</Badge>
                {f.hint && <span className="w-full text-xs text-ink-400">{f.hint}</span>}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <SectionTitle>アカウント</SectionTitle>
        <Card>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" className="w-full text-red-500">
              ログアウト
            </Button>
          </form>
        </Card>
      </section>

      <p className="pb-4 text-center text-xs text-ink-400">
        {APP_NAME_JA}（{APP_NAME}）・地図データ © OpenStreetMap contributors
      </p>
    </div>
  );
}
