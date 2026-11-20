import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { imageUrl } from "@/lib/catalog";
import { Fragment, Suspense } from "react";
import { Layers, Search } from "lucide-react";
import { getTopProviders, REGION } from "@/lib/tmdb";
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
  const feed = searchFeed(typeof sp.q === "string" ? sp.q : null, typeof sp.provider === "string" ? sp.provider : null);
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
  const [result, platforms] = await Promise.all([getFeedPage(feed, page), getTopProviders(10)]);
  const key = feedQuery(feed);
  const platformName = platforms.find((p) => p.id === feed.provider)?.name;
  const platformHref = (provider: number | null) =>
    `/search?${new URLSearchParams({ q: query, ...(provider ? { provider: String(provider) } : {}) })}`;

  const chip = "flex items-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition touch:min-h-11";
  const chipIdle = "bg-paper/70 text-ink/75 ring-1 ring-ink/5 hover:bg-paper hover:text-ink";
  const chipActive = "bg-ink text-paper shadow-md";

  return (
    <Fragment>
      <h1 className="sr-only">Search results for {query}</h1>
      <nav aria-label="Filter by platform" className="mb-7">
        <p className="mb-2.5 text-xs font-medium uppercase tracking-widest text-muted">Streaming on · {REGION}</p>
        <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <li className="shrink-0">
            <Link href={platformHref(null)} aria-current={!feed.provider ? "page" : undefined} className={`${chip} px-4 py-2 ${!feed.provider ? chipActive : chipIdle}`}>
              <Layers className="size-4" /> All platforms
            </Link>
          </li>
          {platforms.map((p) => {
            const active = p.id === feed.provider;
            const logo = imageUrl(p.logoPath, "w92");
            return (
              <li key={p.id} className="shrink-0">
                <Link href={platformHref(active ? null : p.id)} aria-current={active ? "page" : undefined} className={`${chip} p-1 pr-3.5 ${active ? chipActive : chipIdle}`}>
                  {logo && <Image src={logo} alt="" width={28} height={28} className="size-7 rounded-full" />}
                  <span className="max-w-32 truncate">{p.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <InfiniteMediaGrid key={`${key}&from=${result.page}`} query={key}
        title={platformName ? `“${query}” on ${platformName}` : `Results for “${query}”`} showType
        initialItems={result.items} initialPage={result.page} totalPages={result.totalPages}
        emptyHint="Check the spelling, or try a shorter title."
      />
    </Fragment>
  );
}
