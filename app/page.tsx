import { Fragment, Suspense } from "react";
import { Flame } from "lucide-react";
import { LISTS, type ListKey, type MediaType } from "@/lib/catalog";
import { discover, getGenres, getList, getProviders, getTrending, type Media } from "@/lib/tmdb";
import { GenreBrowse } from "@/components/genre-browse";
import { MediaRow, MediaRowSkeleton } from "@/components/media-row";
import { TrendingBanner, TrendingBannerSkeleton } from "@/components/trending-banner";

export default function Home() {
  return (
    <Fragment>
      <section className="pt-4">
        <h1 className="sr-only">Reelio — discover trending movies and series</h1>
        <Suspense fallback={<TrendingBannerSkeleton />}>
          <TrendingBanner />
        </Suspense>
      </section>
      <Row>
        <TrendingRow />
      </Row>
      <Row>
        <PlatformRow rank={0} />
      </Row>
      <Row>
        <ListRow type="movie" list="top_rated" />
      </Row>
      <Row>
        <PlatformRow rank={1} />
      </Row>
      <Row>
        <ListRow type="tv" list="top_rated" title="Binge-worthy series" />
      </Row>
      <Row>
        <PlatformRow rank={2} />
      </Row>
      <Row>
        <ListRow type="movie" list="now_playing" />
      </Row>
      <Row>
        <ListRow type="tv" list="airing_today" title="New episodes today" />
      </Row>
      <Row>
        <PlatformRow rank={3} />
      </Row>
      <Row>
        <ListRow type="movie" list="upcoming" />
      </Row>
      <Suspense fallback={null}>
        <GenreTiles />
      </Suspense>
    </Fragment>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<MediaRowSkeleton />}>{children}</Suspense>;
}

async function safe<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    console.error("[home] row skipped:", error instanceof Error ? error.message : error);
    return null;
  }
}

const browsePath = (type: MediaType) => (type === "movie" ? "/movies" : "/tv");

async function TrendingRow() {
  const items = await safe(() => getTrending("all", "week"));
  if (!items) return null;
  return (
    <MediaRow title="Trending this week" items={items} showType
      icon={<Flame className="size-5 shrink-0 text-orange-500" />}
    />
  );
}

async function ListRow<T extends MediaType>({ type, list, title }: { type: T; list: ListKey<T>; title?: string }) {
  const page = await safe(() => getList(type, list));
  if (!page) return null;
  const meta = (LISTS[type] as Record<string, { title: string }>)[list as string];
  return <MediaRow title={title ?? meta.title} items={page.items} href={`${browsePath(type)}?list=${String(list)}`} />;
}

async function PlatformRow({ rank }: { rank: number }) {
  const providers = await safe(() => getProviders("tv", 4));
  const provider = providers?.[rank];
  if (!provider) return null;

  const [tv, movies] = await Promise.all([
    safe(() => discover("tv", { provider: provider.id })),
    safe(() => discover("movie", { provider: provider.id })),
  ]);
  const items: Media[] = [];
  const a = tv?.items ?? [];
  const b = movies?.items ?? [];
  for (let i = 0; i < Math.max(a.length, b.length) && items.length < 20; i++) {
    if (a[i]) items.push(a[i]);
    if (b[i]) items.push(b[i]);
  }

  return (
    <MediaRow title={`Popular on ${provider.name}`} items={items} showType logoPath={provider.logoPath} href={`/tv?provider=${provider.id}`} />
  );
}

async function GenreTiles() {
  const [movieGenres, tvGenres] = await Promise.all([
    safe(() => getGenres("movie")),
    safe(() => getGenres("tv")),
  ]);
  if (!movieGenres?.length && !tvGenres?.length) return null;
  return <GenreBrowse movieGenres={movieGenres ?? []} tvGenres={tvGenres ?? []} />;
}
