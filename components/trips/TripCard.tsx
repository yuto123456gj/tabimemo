import Link from 'next/link';
import { Badge } from '@/components/ui/Card';
import { formatJaDateShort, tripLengthLabel, tripPhase } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import type { Trip } from '@/types/database';

const PHASE_LABEL = {
  ongoing: { label: '旅行中', tone: 'brand' as const },
  upcoming: { label: 'これから', tone: 'accent' as const },
  past: { label: '終了', tone: 'neutral' as const },
};

export function TripCard({ trip, className }: { trip: Trip; className?: string }) {
  const phase = tripPhase(trip.start_date, trip.end_date);
  const meta = PHASE_LABEL[phase];

  return (
    <Link
      href={`/trips/${trip.id}`}
      className={cn('card group overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-lift', className)}
    >
      <div className="relative h-28 overflow-hidden bg-brand-gradient">
        {trip.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trip.cover_url}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        )}
        <span className="absolute right-2.5 top-2.5">
          <Badge tone={meta.tone} className="bg-white/90 text-ink-800 dark:bg-ink-900/90 dark:text-ink-100">
            {meta.label}
          </Badge>
        </span>
      </div>
      <div className="p-4">
        <h3 className="truncate font-bold text-ink-900 dark:text-ink-50">{trip.title}</h3>
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
          {formatJaDateShort(trip.start_date)} 〜 {formatJaDateShort(trip.end_date)}・
          {tripLengthLabel(trip.start_date, trip.end_date)}
          {trip.is_public && '・共有中'}
        </p>
      </div>
    </Link>
  );
}
