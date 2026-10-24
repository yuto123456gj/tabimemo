import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchTab } from '@/components/places/SearchTab';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { listLists } from '@/lib/data/places';
import { getActiveGroup } from '@/lib/data/session';

export const metadata: Metadata = { title: 'スポットを追加' };

/**
 * 追加画面。Web Share Target（PWA）から来た場合は
 * ?title=...&text=...&url=... が付いてくるので、SNSタブを開いて自動で読み取る。
 */
export default async function NewPlacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const group = await getActiveGroup();

  if (!group) {
    return (
      <EmptyState
        art="group"
        title="グループがありません"
        description="スポットはグループごとに保存されます。まずはグループを作りましょう。"
        action={<ButtonLink href="/groups">グループを作る</ButtonLink>}
      />
    );
  }

  const lists = await listLists(group.id);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold tracking-tight text-ink-900 dark:text-white">スポットを追加</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          <Link href="/places" className="underline">
            {group.name}
          </Link>
          に保存されます
        </p>
      </div>

      <SearchTab groupId={group.id} lists={lists} initialQuery={params.q ?? ''} />
    </div>
  );
}
