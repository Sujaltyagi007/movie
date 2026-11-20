import { isListKey, type MediaType } from "@/lib/catalog";
import { discover, getList, getStreamingProviders, getTopProviders, searchMulti, serviceName, type MediaPage } from "@/lib/tmdb";

/**
 * A paginated list of titles: a browse list / filter on /movies or /tv, or a search.
 * Shared by the pages (first page, server-rendered) and /api/titles (next pages on scroll).
 */
export type Feed =
  | { kind: "browse"; type: MediaType; list: string | null; genre: number | null; provider: number | null }
  /** `provider`: only titles streaming on that service; null = all platforms. */
  | { kind: "search"; query: string; provider: number | null };

export const MAX_PAGE = 500; // TMDB never serves past page 500.

const positiveInt = (value: string | null | undefined) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export function clampPage(value: string | null | undefined) {
  return Math.min(positiveInt(value) ?? 1, MAX_PAGE);
}

export function browseFeed(type: MediaType, params: { list?: string | null; genre?: string | null; provider?: string | null }): Feed {
  const genre = positiveInt(params.genre);
  const provider = positiveInt(params.provider);
  // Genre / platform filters use TMDB discover; otherwise one of the curated lists (default popular).
  const list = genre || provider ? null : isListKey(type, params.list) ? params.list : "popular";
  return { kind: "browse", type, list, genre, provider };
}

export function searchFeed(query: string | null | undefined, provider?: string | null): Feed | null {
  const q = (query ?? "").trim().slice(0, 100);
  return q ? { kind: "search", query: q, provider: positiveInt(provider) } : null;
}

/** Query string identifying the feed (without `page`) — the /api/titles params and a React key. */
export function feedQuery(feed: Feed): string {
  const params = new URLSearchParams();
  if (feed.kind === "search") {
    params.set("q", feed.query);
    if (feed.provider) params.set("provider", String(feed.provider));
  } else {
    params.set("type", feed.type);
    if (feed.list) params.set("list", feed.list);
    if (feed.genre) params.set("genre", String(feed.genre));
    if (feed.provider) params.set("provider", String(feed.provider));
  }
  return params.toString();
}

export function parseFeedQuery(params: URLSearchParams): Feed | null {
  if (params.has("q")) return searchFeed(params.get("q"), params.get("provider"));
  const type = params.get("type");
  if (type !== "movie" && type !== "tv") return null;
  return browseFeed(type, { list: params.get("list"), genre: params.get("genre"), provider: params.get("provider") });
}

/** Adds each title's streaming services (cached per title) so result cards can show them. */
async function withProviders(result: MediaPage): Promise<MediaPage> {
  const items = await Promise.all(
    result.items.map(async (item) => ({ ...item, providers: await getStreamingProviders(item.mediaType, item.id) })),
  );
  return { ...result, items };
}

// A platform filter drops most search hits, so one TMDB page can come back empty. Scan ahead
// until a screenful is collected (or the results run out) so the grid never looks empty early.
const FILTERED_MIN_ITEMS = 12;
const FILTERED_MAX_PAGES = 6;
const FILTERED_BATCH = 3;

async function getSearchPage(feed: Extract<Feed, { kind: "search" }>, page: number): Promise<MediaPage> {
  if (!feed.provider) return withProviders(await searchMulti(feed.query, page));

  // Match by service name, so every plan tier of the chosen service counts (a title may be listed
  // under "Paramount Plus Essential" while the chip is "Paramount Plus").
  const chosen = (await getTopProviders(10)).find((p) => p.id === feed.provider);
  const wanted = chosen ? serviceName(chosen.name).toLowerCase() : null;
  const matches = (p: { id: number; name: string }) => (wanted ? serviceName(p.name).toLowerCase() === wanted : p.id === feed.provider);

  const items: MediaPage["items"] = [];
  const lastAllowed = page + FILTERED_MAX_PAGES - 1;
  let totalPages = Infinity;
  let last = page - 1;
  // Fetch a few pages at a time (in parallel) instead of one by one — much faster when uncached.
  while (items.length < FILTERED_MIN_ITEMS && last < Math.min(lastAllowed, totalPages)) {
    const from = last + 1;
    const to = Math.min(from + FILTERED_BATCH - 1, lastAllowed, totalPages);
    const batch = await Promise.all(
      Array.from({ length: to - from + 1 }, (_, i) => searchMulti(feed.query, from + i).then(withProviders)),
    );
    for (const result of batch) {
      totalPages = Math.min(totalPages, result.totalPages);
      items.push(...result.items.filter((m) => m.providers?.some(matches)));
    }
    last = to;
  }
  // `page` is the last page scanned, so the next request continues right after it.
  const finalTotal = Number.isFinite(totalPages) ? totalPages : page;
  return { items, page: Math.min(last, finalTotal), totalPages: finalTotal };
}

export function getFeedPage(feed: Feed, page: number): Promise<MediaPage> {
  if (feed.kind === "search") return getSearchPage(feed, page);
  const { type, list, genre, provider } = feed;
  if (list && isListKey(type, list)) return getList(type, list, page);
  return discover(type, { genre: genre ?? undefined, provider: provider ?? undefined, page });
}
