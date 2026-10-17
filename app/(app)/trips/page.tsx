import type { Metadata } from 'next';
import { TripCard } from '@/components/trips/TripCard';
import { RealtimeRefresh } from '@/components/layout/RealtimeRefresh';
import { ButtonLink } from '@/components/ui/Button';
import { SectionTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus } from '@/components/ui/Icons';
import { listTrips } from '@/lib/data/trips';
import { getActiveGroup } from '@/lib/data/session';
import { tripPhase } from '@/lib/utils/date';

export const metadata: Metadata = { title: 'しおり' };

export default async function TripsPage() {
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

  const trips = await listTrips(group.id);
  const current = trips.filter((t) => tripPhase(t.start_date, t.end_date) !== 'past');
  const past = trips.filter((t) => tripPhase(t.start_date, t.end_date) === 'past');

  return (
    <div className="space-y-6">
      <RealtimeRefresh channels={[{ table: 'trips', filter: `group_id=eq.${group.id}` }]} />

      <SectionTitle
        action={
          <ButtonLink href="/trips/new" size="sm">
            <IconPlus width={16} height={16} />
            新しいしおり
          </ButtonLink>
        }
      >
        しおり
      </SectionTitle>

      {trips.length === 0 ? (
        <EmptyState
          art="trip"
          title="まだしおりがありません"
          description="日付とタイトルを決めるだけでOK。保存済みのスポットを選んで日程に入れ、最短ルートに並べ替えられます。"
          action={<ButtonLink href="/trips/new">最初のしおりを作る</ButtonLink>}
        />
      ) : (
        <>
          {current.length > 0 && (
            <section>
              <h2 className="mb-2.5 text-sm font-bold text-ink-500 dark:text-ink-400">進行中・これから</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {current.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-2.5 text-sm font-bold text-ink-500 dark:text-ink-400">終わった旅</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {past.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
