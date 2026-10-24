import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Landing } from '@/components/layout/Landing';
import { ButtonLink } from '@/components/ui/Button';
import { Card, SectionTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlaceCard } from '@/components/places/PlaceCard';
import { TripCard } from '@/components/trips/TripCard';
import { IconBook, IconChevronRight, IconPin, IconPlus, IconUsers } from '@/components/ui/Icons';
import { getActiveGroup, getCurrentUser, getMyGroups, getProfile } from '@/lib/data/session';
import { countPlaces, recentPlaces } from '@/lib/data/places';
import { upcomingTrips } from '@/lib/data/trips';
import { isSupabaseConfigured } from '@/lib/env';

export default async function HomePage() {
  const user = isSupabaseConfigured() ? await getCurrentUser() : null;

  // 未ログインはランディングページ
  if (!user) return <Landing />;

  const [groups, activeGroup, profile] = await Promise.all([getMyGroups(), getActiveGroup(), getProfile()]);

  const [places, trips, counts] = activeGroup
    ? await Promise.all([
        recentPlaces(activeGroup.id, 4),
        upcomingTrips(activeGroup.id, 2),
        countPlaces(activeGroup.id),
      ])
    : [[], [], { want: 0, visited: 0 }];

  const name = profile?.display_name ?? 'たびびと';

  return (
    <AppShell groups={groups} activeGroupId={activeGroup?.id ?? null}>
      <div className="space-y-7">
        <section>
          <p className="text-sm text-ink-500 dark:text-ink-400">おかえりなさい、{name} さん</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">
            次はどこに行きましょう？
          </h1>
        </section>

        {!activeGroup ? (
          <EmptyState
            art="group"
            title="まずはグループを作りましょう"
            description="ひとりで使うこともできますが、グループを作ると招待リンクで誰かと一緒にリストを育てられます。"
            action={
              <ButtonLink href="/groups">
                <IconUsers width={18} height={18} />
                グループを作る
              </ButtonLink>
            }
          />
        ) : (
          <>
            {/* サマリー */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="p-4">
                <p className="text-xs text-ink-500 dark:text-ink-400">行きたい</p>
                <p className="mt-1 text-2xl font-extrabold text-brand-600 dark:text-brand-300">{counts.want}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-ink-500 dark:text-ink-400">行った！</p>
                <p className="mt-1 text-2xl font-extrabold text-accent-600 dark:text-accent-300">{counts.visited}</p>
              </Card>
              <Link
                href="/places/new"
                className="card flex items-center gap-2 p-4 transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white">
                  <IconPlus width={20} height={20} />
                </span>
                <span className="text-sm font-bold">スポットを追加</span>
              </Link>
              <Link
                href="/trips/new"
                className="card flex items-center gap-2 p-4 transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-500 text-white">
                  <IconBook width={20} height={20} />
                </span>
                <span className="text-sm font-bold">しおりを作る</span>
              </Link>
            </section>

            {/* 進行中の旅行 */}
            <section>
              <SectionTitle
                action={
                  <Link href="/trips" className="flex items-center gap-0.5 text-sm font-medium text-brand-600 dark:text-brand-300">
                    すべて見る
                    <IconChevronRight width={16} height={16} />
                  </Link>
                }
              >
                進行中・これからの旅
              </SectionTitle>
              {trips.length === 0 ? (
                <EmptyState
                  art="trip"
                  title="まだ旅の予定はありません"
                  description="日付とタイトルを決めるだけで、しおり作りを始められます。保存したスポットをそのまま日程に入れられます。"
                  action={<ButtonLink href="/trips/new">しおりを作る</ButtonLink>}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {trips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              )}
            </section>

            {/* 最近追加したスポット */}
            <section>
              <SectionTitle
                action={
                  <Link href="/places" className="flex items-center gap-0.5 text-sm font-medium text-brand-600 dark:text-brand-300">
                    すべて見る
                    <IconChevronRight width={16} height={16} />
                  </Link>
                }
              >
                最近追加したスポット
              </SectionTitle>
              {places.length === 0 ? (
                <EmptyState
                  art="pin"
                  title="最初の1件を保存してみましょう"
                  description="店名で検索するか、気になった投稿のリンクを貼って名前を書くだけ。あとでしおりに組み込めます。"
                  action={
                    <ButtonLink href="/places/new">
                      <IconPin width={18} height={18} />
                      スポットを追加
                    </ButtonLink>
                  }
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {places.map((place) => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
