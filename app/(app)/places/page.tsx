import type { Metadata } from 'next';
import { PlacesExplorer } from '@/components/places/PlacesExplorer';
import { RealtimeRefresh } from '@/components/layout/RealtimeRefresh';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { SectionTitle } from '@/components/ui/Card';
import { listLists, listPlaces, listTags } from '@/lib/data/places';
import { getActiveGroup } from '@/lib/data/session';

export const metadata: Metadata = { title: 'スポット' };

export default async function PlacesPage() {
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

  const [places, tags, lists] = await Promise.all([
    listPlaces(group.id, { status: 'all' }),
    listTags(group.id),
    listLists(group.id),
  ]);

  return (
    <div>
      <RealtimeRefresh
        channels={[
          { table: 'places', filter: `group_id=eq.${group.id}` },
          { table: 'place_reviews' },
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
      <PlacesExplorer places={places} tags={tags} lists={lists} />
    </div>
  );
}
