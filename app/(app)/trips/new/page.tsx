import type { Metadata } from 'next';
import Link from 'next/link';
import { TripForm } from '@/components/trips/TripForm';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { getActiveGroup } from '@/lib/data/session';

export const metadata: Metadata = { title: 'しおりを作る' };

export default async function NewTripPage() {
  const group = await getActiveGroup();

  if (!group) {
    return (
      <EmptyState
        art="group"
        title="グループがありません"
        description="しおりはグループごとに保存されます。まずはグループを作りましょう。"
        action={<ButtonLink href="/groups">グループを作る</ButtonLink>}
      />
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold tracking-tight text-ink-900 dark:text-white">しおりを作る</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          <Link href="/trips" className="underline">
            {group.name}
          </Link>
          に保存されます
        </p>
      </div>
      <TripForm groupId={group.id} />
    </div>
  );
}
