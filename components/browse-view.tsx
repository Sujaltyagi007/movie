import Link from "next/link";
import { Fragment, Suspense } from "react";
import { BrowseFilters } from "@/components/browse-filters";
import { MediaGridSkeleton } from "@/components/media-grid";
import { InfiniteMediaGrid } from "@/components/infinite-media-grid";
import { LISTS, type MediaType } from "@/lib/catalog";
import { getGenres, getProviders, REGION } from "@/lib/tmdb";
import { browseFeed, clampPage, feedQuery, getFeedPage } from "@/lib/feed";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const COPY = {
  movie: { heading: "Movies", blurb: "Blockbusters, hidden gems and everything in between." },
  tv: { heading: "TV Shows", blurb: "Series to binge, new episodes and all-time classics." },
} as const;

export function BrowseView({ type, searchParams }: { type: MediaType; searchParams: SearchParams }) {
  return (
    <div className="pt-6 sm:pt-8">
      <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{COPY[type].heading}</h1>
      <p className="mt-1.5 text-muted">{COPY[type].blurb}</p>
      <Suspense fallback={<BrowseSkeleton />}>
        <Browse type={type} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const basePath = (type: MediaType) => (type === "movie" ? "/movies" : "/tv");

function buildHref(type: MediaType, params: Record<string, string | number | undefined | null>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, String(value));
  const qs = query.toString();
  return qs ? `${basePath(type)}?${qs}` : basePath(type);
}

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

async function Browse({ type, searchParams }: { type: MediaType; searchParams: SearchParams }) {
  const sp = await searchParams;
  const feed = browseFeed(type, { list: one(sp.list), genre: one(sp.genre), provider: one(sp.provider) });
  if (feed.kind !== "browse") return null;
  const genre = feed.genre ?? undefined;
  const provider = feed.provider ?? undefined;
  const list = feed.list;
  // First page is rendered here; the grid fetches the following ones as the user scrolls.
  // `?page=N` still works as a starting point (old links / shared URLs).
  const startPage = clampPage(one(sp.page));
  const query = feedQuery(feed);

  const [genres, providers, result] = await Promise.all([
    getGenres(type), getProviders(type, 10).catch(() => []),
    getFeedPage(feed, startPage),
  ]);

  const lists = LISTS[type] as Record<string, { label: string; title: string }>;
  const genreName = genres.find((g) => g.id === genre)?.name;
  const providerName = providers.find((p) => p.id === provider)?.name;
  const title = list && lists[list] ? lists[list].title : genreName && providerName ? `${genreName} on ${providerName}` : providerName ? `Popular on ${providerName}` : (genreName ?? "Results");

  const chip = "rounded-full px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:py-2 sm:text-sm";
  const chipIdle = "bg-paper/70 text-ink/70 ring-1 ring-ink/5 hover:bg-paper hover:text-ink";
  const chipActive = "bg-ink text-paper shadow-md";

  const providerOptions = providers.map((p) => {
    const active = p.id === provider;
    return {
      id: p.id,
      name: p.name,
      logoPath: p.logoPath,
      active,
      href: buildHref(type, { provider: active ? null : p.id, genre }),
    };
  });

  const genreOptions = genres.map((g) => {
    const active = g.id === genre;
    return {
      id: g.id,
      name: g.name,
      active,
      href: buildHref(type, { genre: active ? null : g.id, provider }),
    };
  });

  return (
    <Fragment>
      <nav aria-label="Lists" className="mt-5 flex flex-wrap gap-1.5 sm:mt-6 sm:gap-2">
        {Object.entries(lists).map(([key, meta]) => (
          <Link
            key={key}
            href={buildHref(type, { list: key === "popular" ? null : key })}
            aria-current={list === key ? "page" : undefined}
            className={`${chip} ${list === key ? chipActive : chipIdle}`}
          >
            {meta.label}
          </Link>
        ))}
      </nav>

      <BrowseFilters
        region={REGION}
        providers={providerOptions}
        genres={genreOptions}
        clearHref={basePath(type)}
      />

      <section className="mt-7 sm:mt-8">
        {/* Keyed by list + filters, so switching them starts a fresh list from the top. */}
        <InfiniteMediaGrid key={`${query}&from=${result.page}`} query={query} title={title}
          initialItems={result.items} initialPage={result.page} totalPages={result.totalPages}
          emptyHint="Try another genre or platform."
        />
      </section>
    </Fragment>
  );
}

function BrowseSkeleton() {
  return (
    <div aria-hidden>
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, i) => (<div key={i} className="h-9 w-24 animate-pulse rounded-full bg-paper/70" />))}
      </div>
      <div className="mt-4 h-9 w-24 animate-pulse rounded-full bg-paper/70" />
      <div className="mt-8">
        <MediaGridSkeleton />
      </div>
    </div>
  );
}
