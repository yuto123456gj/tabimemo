import type { Metadata } from 'next';
import { PlacesExplorer } from '@/components/places/PlacesExplorer';
import { RealtimeRefresh } from '@/components/layout/RealtimeRefresh';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { SectionTitle } from '@/components/ui/Card';
import { listLists, listPlaceCategories, listPlaces, listTags } from '@/lib/data/places';
import { getActiveGroup } from '@/lib/data/session';

export const metadata: Metadata = { title: 'スポット' };

/** ホームの「行きたい」「行った！」から来たときは、その絞り込みで開く */
function initialStatusFrom(value: string | string[] | undefined): 'all' | 'want' | 'visited' {
  return value === 'want' || value === 'visited' ? value : 'all';
}

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const [group, params] = await Promise.all([getActiveGroup(), searchParams]);
  const status = initialStatusFrom(params.status);

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

  const [places, tags, lists, categories] = await Promise.all([
    listPlaces(group.id, { status: 'all' }),
    listTags(group.id),
    listLists(group.id),
    listPlaceCategories(group.id),
  ]);

  return (
    <div>
      <RealtimeRefresh
        channels={[
          { table: 'places', filter: `group_id=eq.${group.id}` },
          { table: 'place_reviews' },
          { table: 'place_categories', filter: `group_id=eq.${group.id}` },
        ]}
      />
      <SectionTitle
        action={
          <ButtonLink href="/places/new" size="sm">
            追加
          </ButtonLink>
        }
      >
        {group.name}
      </SectionTitle>
      {/* key を付けて、?status= が変わったら絞り込みを初期値から作り直す */}
      <PlacesExplorer
        key={status}
        places={places}
        tags={tags}
        lists={lists}
        categories={categories}
        initialStatus={status}
      />
    </div>
  );
}
