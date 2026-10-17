import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TripEditor } from '@/components/trips/TripEditor';
import { RealtimeRefresh } from '@/components/layout/RealtimeRefresh';
import { IconChevronRight } from '@/components/ui/Icons';
import { getTrip, getTripBudget, getTripChecklist, getTripItems } from '@/lib/data/trips';
import { listPlaces } from '@/lib/data/places';
import { getGroupMembers } from '@/lib/data/session';
import { env } from '@/lib/env';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const trip = await getTrip(id);
  return { title: trip?.title ?? 'しおり' };
}

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();

  const [items, checklist, budget, places, members] = await Promise.all([
    getTripItems(trip.id),
    getTripChecklist(trip.id),
    getTripBudget(trip.id),
    listPlaces(trip.group_id, { status: 'all' }),
    getGroupMembers(trip.group_id),
  ]);

  return (
    <div>
      <RealtimeRefresh
        channels={[
          { table: 'trip_items', filter: `trip_id=eq.${trip.id}` },
          { table: 'trip_checklist', filter: `trip_id=eq.${trip.id}` },
          { table: 'trip_budget_items', filter: `trip_id=eq.${trip.id}` },
          { table: 'trips', filter: `id=eq.${trip.id}` },
        ]}
      />

      <nav className="mb-3 flex items-center gap-1 text-xs text-ink-400">
        <Link href="/trips" className="hover:underline">
          しおり
        </Link>
        <IconChevronRight width={12} height={12} />
        <span className="truncate">{trip.title}</span>
      </nav>

      <TripEditor
        trip={trip}
        initialItems={items}
        checklist={checklist}
        budget={budget}
        places={places}
        memberCount={Math.max(1, members.length)}
        siteUrl={env.siteUrl}
      />
    </div>
  );
}
