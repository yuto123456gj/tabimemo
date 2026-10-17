import Link from 'next/link';
import { Badge } from '@/components/ui/Card';
import { StarRating } from '@/components/ui/StarRating';
import { categoryMeta } from '@/lib/constants';
import { formatJaDateShort } from '@/lib/utils/date';
import { formatDistance } from '@/lib/route/geo';
import { cn } from '@/lib/utils/cn';
import type { PlaceWithExtras } from '@/types/database';

export function placeAverageRating(place: PlaceWithExtras): number | null {
  const ratings = (place.place_reviews ?? [])
    .map((r) => r.rating)
    .filter((r): r is number => typeof r === 'number');
  if (ratings.length === 0) return null;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

export function placeWantAgain(place: PlaceWithExtras): boolean {
  return (place.place_reviews ?? []).some((r) => r.want_again);
}

/** 写真が無いスポット用の背景（カテゴリごとに色味を変える） */
function PhotoPlaceholder({ category }: { category: string | null }) {
  const meta = categoryMeta(category);
  return (
    <div className="flex h-full w-full items-center justify-center bg-sky-gradient dark:bg-ink-800">
      <span className="text-3xl" aria-hidden="true">
        {meta.emoji}
      </span>
    </div>
  );
}

export function PlaceCard({
  place,
  distanceMeters,
  className,
}: {
  place: PlaceWithExtras;
  distanceMeters?: number | null;
  className?: string;
}) {
  const meta = categoryMeta(place.category);
  const rating = placeAverageRating(place);
  const tags = (place.place_tags ?? []).map((pt) => pt.tags?.name).filter(Boolean) as string[];

  return (
    <Link
      href={`/places/${place.id}`}
      className={cn(
        'card group flex gap-3 overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-lift',
        className,
      )}
    >
      <div className="relative h-[108px] w-[108px] shrink-0 overflow-hidden sm:h-32 sm:w-32">
        {place.photo_url ? (
          // 外部ドメインが多岐にわたるため next/image ではなく img を使う
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.photo_url}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <PhotoPlaceholder category={place.category} />
        )}
        {place.status === 'visited' && (
          <span className="absolute left-1.5 top-1.5 rounded-pill bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            行った！
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 py-3 pr-3">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink-900 dark:text-ink-50">
            {place.name}
          </h3>
        </div>

        {place.address && (
          <p className="mt-0.5 truncate text-xs text-ink-500 dark:text-ink-400">{place.address}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone="brand">
            {meta.emoji} {meta.label}
          </Badge>
          {place.planned_date && <Badge tone="accent">{formatJaDateShort(place.planned_date)}</Badge>}
          {typeof distanceMeters === 'number' && <Badge tone="neutral">{formatDistance(distanceMeters)}</Badge>}
          {placeWantAgain(place) && <Badge tone="accent">また行きたい</Badge>}
        </div>

        {rating !== null && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <StarRating value={Math.round(rating)} readOnly size={14} />
            <span className="text-xs text-ink-400">{rating.toFixed(1)}</span>
          </div>
        )}

        {tags.length > 0 && (
          <p className="mt-1.5 truncate text-xs text-accent-600 dark:text-accent-300">
            {tags.map((t) => `#${t}`).join(' ')}
          </p>
        )}

        {place.profiles?.display_name && (
          <p className="mt-1.5 text-[11px] text-ink-400">{place.profiles.display_name} が追加</p>
        )}
      </div>
    </Link>
  );
}
