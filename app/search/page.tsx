import type { Metadata } from "next";
import { Fragment, Suspense } from "react";
import { Search } from "lucide-react";
import { MediaGridSkeleton } from "@/components/media-grid";
import { InfiniteMediaGrid } from "@/components/infinite-media-grid";
import { clampPage, feedQuery, getFeedPage, searchFeed } from "@/lib/feed";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="pt-6 sm:pt-8">
      <Suspense fallback={<MediaGridSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const sp = await searchParams;
  const feed = searchFeed(typeof sp.q === "string" ? sp.q : null);
  const page = clampPage(typeof sp.page === "string" ? sp.page : null);

  if (!feed || feed.kind !== "search") {
    return (
      <div className="grid place-items-center py-24 text-center">
        <Search className="size-10 text-muted" strokeWidth={1.5} />
        <h1 className="mt-4 text-2xl font-medium tracking-tight">Search movies & TV shows</h1>
        <p className="mt-2 text-muted">Use the search box at the top to find any title.</p>
      </div>
    );
  }

  const query = feed.query;
  const result = await getFeedPage(feed, page);
  const key = feedQuery(feed);

  return (
    <Fragment>
      <h1 className="sr-only">Search results for {query}</h1>
      {/* Keyed by the query, so a new search starts a fresh list; more results load on scroll. */}
      <InfiniteMediaGrid key={`${key}&from=${result.page}`} query={key} title={`Results for “${query}”`} showType
        initialItems={result.items} initialPage={result.page} totalPages={result.totalPages}
        emptyHint="Check the spelling, or try a shorter title."
      />
    </Fragment>
  );
}
