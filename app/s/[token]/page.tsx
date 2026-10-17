import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapContainer } from '@/components/map/MapContainer';
import { PrintButton } from '@/components/trips/PrintButton';
import { Badge } from '@/components/ui/Card';
import { APP_NAME_JA } from '@/lib/constants';
import { categoryMeta, transportMeta } from '@/lib/constants';
import { getPublicTrip, type PublicTripItem } from '@/lib/data/trips';
import { formatJaDate, formatJaMonthDay, formatJaTime, formatStayMinutes, formatYen, tripDates, tripLengthLabel } from '@/lib/utils/date';
import { googleMapsDirectionsUrl } from '@/lib/route/googleMaps';

/** 共有ページはログイン不要。毎回最新を取得する。 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const data = await getPublicTrip(token);
  return {
    title: data ? `${data.trip.title}のしおり` : 'しおり',
    // 共有ページは検索エンジンに載せない
    robots: { index: false, follow: false },
  };
}

export default async function PublicTripPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPublicTrip(token);

  if (!data) notFound();

  const { trip, items, checklist, budget } = data;
  const days = tripDates(trip.start_date, trip.end_date);
  const budgetTotal = budget.reduce((sum, b) => sum + b.amount, 0);

  const itemsByDay = days.map((_, index) =>
    items.filter((i) => i.day_index === index).sort((a, b) => a.order_index - b.order_index),
  );

  return (
    <div className="min-h-dvh bg-ink-50 print-compact dark:bg-ink-950">
      {/* ヘッダー */}
      <header className="border-b border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-extrabold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-gradient text-white">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21s6-6 6-10.5A6 6 0 0 0 6 10.5C6 15 12 21 12 21Z" />
                <circle cx="12" cy="10.2" r="2" />
              </svg>
            </span>
            {APP_NAME_JA}
          </Link>
          <span className="no-print">
            <PrintButton />
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6">
        {/* タイトル */}
        <div className="print-avoid-break">
          {trip.cover_url && (
            <div className="mb-4 h-40 overflow-hidden rounded-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={trip.cover_url} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">{trip.title}</h1>
          <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-300">
            {formatJaDate(trip.start_date)} 〜 {formatJaDate(trip.end_date)}（
            {tripLengthLabel(trip.start_date, trip.end_date)}）
          </p>
        </div>

        {/* 日ごとの予定 */}
        {itemsByDay.map((dayItems, dayIndex) => {
          const withCoords = dayItems.filter(
            (i): i is PublicTripItem & { lat: number; lng: number } =>
              typeof i.lat === 'number' && typeof i.lng === 'number',
          );
          const googleUrl = googleMapsDirectionsUrl(
            withCoords.map((i) => ({ lat: i.lat, lng: i.lng, name: i.title ?? '' })),
          );

          return (
            <section key={dayIndex} className={dayIndex > 0 ? 'mt-8 print-break' : 'mt-8'}>
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-sm font-extrabold text-white">
                  {dayIndex + 1}
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink-900 dark:text-ink-50">{dayIndex + 1}日目</h2>
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    {formatJaMonthDay(days[dayIndex])}・{dayItems.length}件
                  </p>
                </div>
                {googleUrl && (
                  <a
                    href={googleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="no-print ml-auto rounded-pill border border-ink-200 px-3 py-1.5 text-xs font-medium dark:border-ink-700"
                  >
                    Googleマップで開く
                  </a>
                )}
              </div>

              {dayItems.length === 0 ? (
                <p className="rounded-card border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-400 dark:border-ink-700">
                  この日は予定がありません
                </p>
              ) : (
                <>
                  {withCoords.length > 0 && (
                    <div className="no-print mb-3">
                      <MapContainer
                        markers={withCoords.map((i, index) => ({
                          id: i.id,
                          lat: i.lat,
                          lng: i.lng,
                          label: i.title ?? '',
                          order: index + 1,
                        }))}
                        route={withCoords.map((i) => ({ lat: i.lat, lng: i.lng }))}
                        className="h-52 w-full border border-ink-100 dark:border-ink-800"
                        interactive={false}
                      />
                    </div>
                  )}

                  <ol className="space-y-2.5">
                    {dayItems.map((item, index) => (
                      <li key={item.id} className="print-card card flex gap-3 p-3 print-avoid-break">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            {item.arrive_time && (
                              <span className="font-bold tabular-nums text-brand-600 dark:text-brand-300">
                                {formatJaTime(item.arrive_time)}
                              </span>
                            )}
                            <span className="font-bold text-ink-900 dark:text-ink-50">{item.title}</span>
                          </div>
                          {item.address && (
                            <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{item.address}</p>
                          )}
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {item.category && <Badge tone="brand">{categoryMeta(item.category).label}</Badge>}
                            {item.stay_minutes ? (
                              <Badge tone="neutral">滞在 {formatStayMinutes(item.stay_minutes)}</Badge>
                            ) : null}
                            {item.transport && (
                              <Badge tone="neutral">
                                {transportMeta(item.transport).emoji} {transportMeta(item.transport).label}
                              </Badge>
                            )}
                          </div>
                          {item.memo && (
                            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-ink-600 dark:text-ink-300">
                              {item.memo}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </section>
          );
        })}

        {/* 持ち物 */}
        {checklist.length > 0 && (
          <section className="mt-8 print-avoid-break">
            <h2 className="mb-2.5 text-base font-bold text-ink-900 dark:text-ink-50">持ち物</h2>
            <ul className="print-card card grid grid-cols-2 gap-x-4 gap-y-1.5 p-4 text-sm">
              {checklist.map((c, i) => (
                <li key={`${c.label}-${i}`} className="flex items-center gap-2">
                  <span
                    className="grid h-4 w-4 shrink-0 place-items-center rounded border border-ink-300 text-[10px] dark:border-ink-600"
                    aria-hidden="true"
                  >
                    {c.checked ? '✓' : ''}
                  </span>
                  <span className={c.checked ? 'text-ink-400 line-through' : ''}>{c.label}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 予算 */}
        {budget.length > 0 && (
          <section className="mt-8 print-avoid-break">
            <h2 className="mb-2.5 text-base font-bold text-ink-900 dark:text-ink-50">予算</h2>
            <div className="print-card card p-4">
              <ul className="divide-y divide-ink-100 text-sm dark:divide-ink-800">
                {budget.map((b, i) => (
                  <li key={`${b.label}-${i}`} className="flex items-center gap-2 py-1.5">
                    {b.category && <span className="shrink-0 text-xs text-ink-400">{b.category}</span>}
                    <span className="min-w-0 flex-1 truncate">{b.label}</span>
                    <span className="shrink-0 tabular-nums">{formatYen(b.amount)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex items-center justify-between border-t border-ink-200 pt-2 text-sm font-extrabold dark:border-ink-700">
                <span>合計</span>
                <span className="tabular-nums">{formatYen(budgetTotal)}</span>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-10 border-t border-ink-100 pt-5 text-center text-xs text-ink-400 dark:border-ink-800">
          <p>このページは共有用の読み取り専用ページです（{APP_NAME_JA}で作成）</p>
          <p className="mt-1">地図データ © OpenStreetMap contributors</p>
          <p className="no-print mt-3">
            <Link href="/" className="underline">
              {APP_NAME_JA}を使ってみる
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
