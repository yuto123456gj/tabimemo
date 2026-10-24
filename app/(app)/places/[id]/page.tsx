import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapContainer } from '@/components/map/MapContainer';
import { PlaceActions } from '@/components/places/PlaceActions';
import { SetLocationCard } from '@/components/places/SetLocationCard';
import { ReviewForm } from '@/components/places/ReviewForm';
import { RealtimeRefresh } from '@/components/layout/RealtimeRefresh';
import { Badge, Card, SectionTitle } from '@/components/ui/Card';
import { StarRating } from '@/components/ui/StarRating';
import { IconChevronRight, IconLink, IconMap } from '@/components/ui/Icons';
import { categoryMeta } from '@/lib/constants';
import { getPlace, listLists } from '@/lib/data/places';
import { getCurrentUser, getGroupMembers } from '@/lib/data/session';
import { formatJaDate, relativeFromNow } from '@/lib/utils/date';
import { googleMapsPlaceUrl } from '@/lib/route/googleMaps';
import { hasLocation } from '@/lib/utils/place';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const place = await getPlace(id);
  return { title: place?.name ?? 'スポット' };
}

export default async function PlaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [place, user] = await Promise.all([getPlace(id), getCurrentUser()]);

  if (!place) notFound();

  const [lists, members] = await Promise.all([listLists(place.group_id), getGroupMembers(place.group_id)]);

  const reviews = place.place_reviews ?? [];
  const myReview = reviews.find((r) => r.user_id === user?.id) ?? null;
  const otherReviews = reviews.filter((r) => r.user_id !== user?.id);
  const memberName = (userId: string) => members.find((m) => m.user_id === userId)?.display_name ?? 'メンバー';

  const tags = (place.place_tags ?? []).map((pt) => pt.tags?.name).filter(Boolean) as string[];
  const memberListIds = (place.list_places ?? []).map((lp) => lp.list_id);
  const meta = categoryMeta(place.category);

  const ratings = reviews.map((r) => r.rating).filter((r): r is number => typeof r === 'number');
  const average = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  return (
    <div className="space-y-5">
      <RealtimeRefresh channels={[{ table: 'places', filter: `id=eq.${place.id}` }, { table: 'place_reviews' }]} />

      <nav className="flex items-center gap-1 text-xs text-ink-400">
        <Link href="/places" className="hover:underline">
          スポット
        </Link>
        <IconChevronRight width={12} height={12} />
        <span className="truncate">{place.name}</span>
      </nav>

      {/* ヘッダー */}
      <div className="card overflow-hidden p-0">
        <div className="relative h-44 w-full sm:h-56">
          {place.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={place.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-sky-gradient dark:bg-ink-800">
              <span className="text-5xl" aria-hidden="true">
                {meta.emoji}
              </span>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="brand">
              {meta.emoji} {meta.label}
            </Badge>
            <Badge tone={place.status === 'visited' ? 'accent' : 'neutral'}>
              {place.status === 'visited' ? '✅ 行った！' : '✨ 行きたい'}
            </Badge>
            {place.planned_date && <Badge tone="accent">予定 {formatJaDate(place.planned_date)}</Badge>}
            {!hasLocation(place) && <Badge tone="neutral">📍 場所は未設定</Badge>}
          </div>

          <h1 className="mt-2 text-xl font-extrabold tracking-tight text-ink-900 dark:text-white">{place.name}</h1>
          {place.address && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{place.address}</p>}

          {average !== null && (
            <div className="mt-2 flex items-center gap-2">
              <StarRating value={Math.round(average)} readOnly size={18} />
              <span className="text-sm text-ink-500 dark:text-ink-400">
                {average.toFixed(1)}（{ratings.length}人）
              </span>
            </div>
          )}

          {tags.length > 0 && (
            <p className="mt-2 text-sm text-accent-600 dark:text-accent-300">
              {tags.map((t) => `#${t}`).join(' ')}
            </p>
          )}

          <p className="mt-3 text-xs text-ink-400">
            {place.profiles?.display_name ?? 'メンバー'} が {relativeFromNow(place.created_at)}に追加
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {hasLocation(place) && (
              <a
                href={googleMapsPlaceUrl({ name: place.name, lat: place.lat, lng: place.lng })}
                target="_blank"
                rel="noreferrer"
                className="chip"
              >
                <IconMap width={16} height={16} />
                Googleマップで開く
              </a>
            )}
            {place.source_url && (
              <a href={place.source_url} target="_blank" rel="noreferrer" className="chip">
                <IconLink width={16} height={16} />
                元の投稿を見る
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 地図 / 場所が未設定ならここで決められる */}
      {hasLocation(place) ? (
        <MapContainer
          markers={[
            { id: place.id, lat: place.lat, lng: place.lng, label: place.name, visited: place.status === 'visited' },
          ]}
          className="h-48 w-full border border-ink-100 dark:border-ink-800"
        />
      ) : (
        <SetLocationCard placeId={place.id} placeName={place.name} />
      )}

      {/* 自分の記録 */}
      <section>
        <SectionTitle>行った記録（自分）</SectionTitle>
        <Card>
          <ReviewForm placeId={place.id} review={myReview} />
        </Card>
      </section>

      {/* ほかのメンバーの記録 */}
      {otherReviews.length > 0 && (
        <section>
          <SectionTitle>メンバーの記録</SectionTitle>
          <ul className="space-y-2">
            {otherReviews.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-ink-900 dark:text-ink-50">{memberName(r.user_id)}</p>
                  {r.visited_on && <span className="text-xs text-ink-400">{formatJaDate(r.visited_on)}</span>}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  {r.rating && <StarRating value={r.rating} readOnly size={15} />}
                  {r.want_again && <Badge tone="accent">💖 また行きたい</Badge>}
                </div>
                {r.comment && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-700 dark:text-ink-200">
                    {r.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 編集 */}
      <section>
        <SectionTitle>このスポットの設定</SectionTitle>
        <Card>
          <PlaceActions place={place} lists={lists} memberListIds={memberListIds} />
        </Card>
      </section>
    </div>
  );
}
