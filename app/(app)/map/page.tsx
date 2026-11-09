import type { Metadata } from 'next';
import { SpotsMap } from '@/components/map/SpotsMap';
import { RealtimeRefresh } from '@/components/layout/RealtimeRefresh';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { SectionTitle } from '@/components/ui/Card';
import { IconPin } from '@/components/ui/Icons';
import { listPlaces } from '@/lib/data/places';
import { getActiveGroup } from '@/lib/data/session';

export const metadata: Metadata = { title: '地図' };

export default async function MapPage() {
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

  const places = await listPlaces(group.id, { status: 'all' });

  return (
    <div>
      <RealtimeRefresh channels={[{ table: 'places', filter: `group_id=eq.${group.id}` }]} />
      <SectionTitle
        action={
          <ButtonLink href="/places/new" size="sm">
            追加
          </ButtonLink>
        }
      >
        地図
      </SectionTitle>

      {places.length === 0 ? (
        <EmptyState
          art="map"
          title="まだスポットがありません"
          description="スポットを追加すると、その場所に自動でピンが立ちます。ピンをタップすると、どんな場所かを確認できます。"
          action={
            <ButtonLink href="/places/new">
              <IconPin width={18} height={18} />
              スポットを追加
            </ButtonLink>
          }
        />
      ) : (
        <SpotsMap places={places} />
      )}
    </div>
  );
}
