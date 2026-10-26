import type { Metadata } from 'next';
import { GroupManager, type GroupDetail } from '@/components/layout/GroupManager';
import { JoinByCode } from '@/components/layout/JoinByCode';
import { RealtimeRefresh } from '@/components/layout/RealtimeRefresh';
import { EmptyState } from '@/components/ui/EmptyState';
import { getActiveGroup, getCurrentUser, getGroupMembers, getMyGroups } from '@/lib/data/session';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata: Metadata = { title: 'グループ' };

export default async function GroupsPage() {
  const [groups, activeGroup, user] = await Promise.all([getMyGroups(), getActiveGroup(), getCurrentUser()]);

  const details: GroupDetail[] = [];

  if (isSupabaseConfigured()) {
    for (const group of groups) {
      details.push({ group, members: await getGroupMembers(group.id) });
    }
  }

  return (
    <div className="space-y-4">
      <RealtimeRefresh channels={[{ table: 'group_members' }]} label="メンバーが更新されました" />

      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-ink-900 dark:text-white">グループ</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          リストは「グループ」ごとに保存されます。合言葉を伝えれば、相手の画面にもすぐ反映されます。
        </p>
      </div>

      <JoinByCode />

      {groups.length === 0 && (
        <EmptyState
          art="group"
          title="まだグループがありません"
          description="下のフォームから最初のグループを作ってください。あとから名前を変えたり、追加したりできます。"
        />
      )}

      <GroupManager details={details} activeGroupId={activeGroup?.id ?? null} currentUserId={user?.id ?? null} />
    </div>
  );
}
