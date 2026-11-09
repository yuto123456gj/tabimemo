import type { Metadata } from 'next';
import { AvatarSettings } from '@/components/layout/AvatarSettings';
import { ProfileSettings } from '@/components/layout/ProfileSettings';
import { PushSettings } from '@/components/layout/PushSettings';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Avatar } from '@/components/ui/Avatar';
import { Notice } from '@/components/ui/Feedback';
import { SettingsActionRow, SettingsGroup, SettingsInfoRow, SettingsLinkRow } from '@/components/layout/SettingsRow';
import { Button } from '@/components/ui/Button';
import {
  IconList,
  IconMap,
  IconPin,
  IconSettings,
  IconSparkles,
  IconUsers,
} from '@/components/ui/Icons';
import { APP_NAME, APP_NAME_JA } from '@/lib/constants';
import { env, isPushConfigured } from '@/lib/env';
import { getActiveGroup, getCurrentUser, getMyGroups, getProfile } from '@/lib/data/session';
import { countPlaces, listLists, listTags } from '@/lib/data/places';

export const metadata: Metadata = { title: '設定' };

export default async function SettingsPage() {
  const [user, profile, groups, activeGroup] = await Promise.all([
    getCurrentUser(),
    getProfile(),
    getMyGroups(),
    getActiveGroup(),
  ]);

  const [counts, lists, tags] = activeGroup
    ? await Promise.all([countPlaces(activeGroup.id), listLists(activeGroup.id), listTags(activeGroup.id)])
    : [{ want: 0, visited: 0 }, [], []];

  const displayName = profile?.display_name ?? 'たびびと';

  return (
    <div className="space-y-6">
      {/* プロフィールヘッダー */}
      <section className="flex items-center gap-4">
        <Avatar name={displayName} avatarUrl={profile?.avatar_url ?? null} size={64} className="shadow-lift" />
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
          <p className="text-2xl font-extrabold text-ink-700 dark:text-ink-200">{counts.want + counts.visited}</p>
          <p className="mt-0.5 text-[11px] text-ink-500 dark:text-ink-400">ぜんぶ</p>
        </div>
      </section>

      {/* アカウント */}
      <SettingsGroup title="アカウント">
        <li className="px-4 py-3.5">
          <p className="label">アイコン</p>
          {user && (
            <AvatarSettings
              name={displayName}
              currentAvatar={profile?.avatar_url ?? null}
              userId={user.id}
            />
          )}
        </li>
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
        footer="スポットはグループごとに保存されます。合言葉を伝えて参加してもらうと、相手の画面にもすぐ反映されます。"
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
          href="/map"
          icon={<IconMap width={18} height={18} />}
          label="地図で見る"
          value={`${counts.want + counts.visited}件`}
        />
        <SettingsInfoRow
          icon={<IconList width={18} height={18} />}
          label="リスト / タグ"
          value={`${lists.length} / ${tags.length}`}
        />
      </SettingsGroup>

      {/* 通知 */}
      <SettingsGroup
        title="通知"
        footer="通知は端末ごとにON/OFFします。自分が追加したスポットでは、自分には通知は届きません。"
      >
        <li className="px-4 py-3.5">
          {isPushConfigured() ? (
            <PushSettings vapidPublicKey={env.vapidPublicKey} />
          ) : (
            <Notice tone="info">
              通知を使うには、サイト側に通知用のキー（VAPID）を設定する必要があります。README の「通知の設定」を参照してください。
            </Notice>
          )}
        </li>
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
