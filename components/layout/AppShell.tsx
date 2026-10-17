import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { Notice } from '@/components/ui/Feedback';
import { isSupabaseConfigured } from '@/lib/env';
import type { GroupWithRole } from '@/lib/data/session';

/** ログイン後の共通レイアウト（上部バー + 下部タブ） */
export function AppShell({
  groups,
  activeGroupId,
  children,
}: {
  groups: GroupWithRole[];
  activeGroupId: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <TopBar groups={groups} activeGroupId={activeGroupId} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 md:pb-12">
        {!isSupabaseConfigured() && (
          <Notice tone="warn" className="mb-4">
            Supabase がまだ設定されていません。<code className="mx-1 rounded bg-black/5 px-1">.env.local</code>
            に接続情報を入れると、保存・共有・しおりが使えるようになります（README参照）。
          </Notice>
        )}
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
