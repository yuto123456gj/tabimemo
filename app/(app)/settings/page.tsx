import type { Metadata } from 'next';
import { ProfileSettings } from '@/components/layout/ProfileSettings';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { SettingsActionRow, SettingsGroup, SettingsInfoRow, SettingsLinkRow } from '@/components/layout/SettingsRow';
import { Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  IconBook,
  IconLink,
  IconList,
  IconMap,
  IconPin,
  IconRoute,
  IconSettings,
  IconSparkles,
  IconUsers,
} from '@/components/ui/Icons';
import { APP_NAME, APP_NAME_JA } from '@/lib/constants';
import { getActiveGroup, getCurrentUser, getMyGroups, getProfile } from '@/lib/data/session';
import { countPlaces, listLists, listTags } from '@/lib/data/places';
import { listTrips } from '@/lib/data/trips';
import { env, isSupabaseConfigured } from '@/lib/env';

export const metadata: Metadata = { title: '設定' };

export default async function SettingsPage() {
  const [user, profile, groups, activeGroup] = await Promise.all([
    getCurrentUser(),
    getProfile(),
    getMyGroups(),
    getActiveGroup(),
  ]);

  const [counts, trips, lists, tags] = activeGroup
    ? await Promise.all([
        countPlaces(activeGroup.id),
        listTrips(activeGroup.id),
        listLists(activeGroup.id),
        listTags(activeGroup.id),
      ])
    : [{ want: 0, visited: 0 }, [], [], []];

  const displayName = profile?.display_name ?? 'たびびと';
  const initial = displayName.slice(0, 1);

  return (
    <div className="space-y-6">
      {/* プロフィールヘッダー */}
      <section className="flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-gradient text-2xl font-extrabold text-white shadow-lift">
          {initial}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold tracking-tight text-ink-900 dark:text-white">
            {displayName}
          </h1>
          <p className="truncate text-sm text-ink-500 dark:text-ink-400">{user?.email ?? '—'}</p>
        </div>
      </section>

      {/* 数字のまとめ */}
      <section className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-2xl font-extrabold text-brand-600 dark:text-brand-300">{counts.want}</p>
          <p className="mt-0.5 text-[11px] text-ink-500 dark:text-ink-400">行きたい</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-extrabold text-accent-600 dark:text-accent-300">{counts.visited}</p>
          <p className="mt-0.5 text-[11px] text-ink-500 dark:text-ink-400">行った！</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-extrabold text-ink-700 dark:text-ink-200">{trips.length}</p>
          <p className="mt-0.5 text-[11px] text-ink-500 dark:text-ink-400">しおり</p>
        </div>
      </section>

      {/* アカウント */}
      <SettingsGroup title="アカウント">
        <li className="px-4 py-3.5">
          <ProfileSettings initialName={profile?.display_name ?? ''} />
        </li>
        <SettingsInfoRow
          icon={<IconSettings width={18} height={18} />}
          label="メールアドレス"
          value={<span className="max-w-[160px] truncate">{user?.email ?? '—'}</span>}
        />
      </SettingsGroup>

      {/* グループ */}
      <SettingsGroup
        title="グループ"
        footer="スポットとしおりはグループごとに保存されます。招待リンクを送ると、相手の画面にもすぐ反映されます。"
      >
        <SettingsInfoRow
          icon={<IconUsers width={18} height={18} />}
          label="いま表示中"
          value={activeGroup?.name ?? 'なし'}
        />
        <SettingsLinkRow
          href="/groups"
          icon={<IconUsers width={18} height={18} />}
          label="グループを管理・招待する"
          value={`${groups.length}個`}
        />
      </SettingsGroup>

      {/* データ */}
      <SettingsGroup title="データ">
        <SettingsLinkRow
          href="/places"
          icon={<IconPin width={18} height={18} />}
          label="保存したスポット"
          value={`${counts.want + counts.visited}件`}
        />
        <SettingsLinkRow
          href="/trips"
          icon={<IconBook width={18} height={18} />}
          label="しおり"
          value={`${trips.length}件`}
        />
        <SettingsInfoRow
          icon={<IconList width={18} height={18} />}
          label="リスト / タグ"
          value={`${lists.length} / ${tags.length}`}
        />
        <SettingsLinkRow
          href="/places/new?tab=import"
          icon={<IconLink width={18} height={18} />}
          label="Googleマップから一括取り込み"
          description="Google Takeout の GeoJSON / CSV に対応"
        />
      </SettingsGroup>

      {/* 表示 */}
      <SettingsGroup title="表示">
        <SettingsActionRow
          icon={<IconSparkles width={18} height={18} />}
          label="ダークモード"
          description="端末の設定に合わせつつ、手動でも切り替えられます"
          action={
            <ThemeToggle className="rounded-pill border border-ink-200 p-2.5 text-ink-600 transition hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800" />
          }
        />
      </SettingsGroup>

      {/* 連携状況 */}
      <SettingsGroup
        title="連携状況"
        footer="いまはすべて無料のサービスで動いています。お店が見つかりにくいと感じたら、Google Places を繋ぐと検索精度が上がり、写真も付くようになります（従量課金）。"
      >
        <SettingsInfoRow
          icon={<IconMap width={18} height={18} />}
          label="場所検索"
          value={<Badge tone="brand">{env.googlePlacesKey ? 'Google Places' : 'OpenStreetMap'}</Badge>}
          description={
            env.googlePlacesKey
              ? 'Googleの地図データで検索しています'
              : '無料のOpenStreetMapで検索しています。個人店や新しいお店は見つからないことがあります'
          }
        />
        <SettingsInfoRow
          icon={<IconRoute width={18} height={18} />}
          label="ルート計算"
          value={<Badge tone="brand">OSRM</Badge>}
          description="取得できない時は直線距離で計算します"
        />
        <SettingsInfoRow
          icon={<IconSettings width={18} height={18} />}
          label="データベース"
          value={<Badge tone={isSupabaseConfigured() ? 'accent' : 'neutral'}>{isSupabaseConfigured() ? '接続中' : '未設定'}</Badge>}
        />
      </SettingsGroup>

      {/* その他 */}
      <SettingsGroup title="その他">
        <SettingsLinkRow
          href="https://github.com/yuto123456gj/tabimemo"
          external
          icon={<IconLink width={18} height={18} />}
          label="ソースコード（GitHub）"
        />
        <SettingsInfoRow label="バージョン" value="0.1.0" />
      </SettingsGroup>

      {/* ログアウト */}
      <form action="/auth/signout" method="post">
        <Button type="submit" variant="outline" className="w-full text-red-500">
          ログアウト
        </Button>
      </form>

      <p className="pb-4 text-center text-xs leading-relaxed text-ink-400">
        {APP_NAME_JA}（{APP_NAME}）
        <br />
        地図データ © OpenStreetMap contributors
      </p>
    </div>
  );
}
