import { isListKey, type MediaType } from "@/lib/catalog";
import { discover, getList, searchMulti, type MediaPage } from "@/lib/tmdb";

/**
 * A paginated list of titles: a browse list / filter on /movies or /tv, or a search.
 * Shared by the pages (first page, server-rendered) and /api/titles (next pages on scroll).
 */
export type Feed =
  | { kind: "browse"; type: MediaType; list: string | null; genre: number | null; provider: number | null }
  | { kind: "search"; query: string };

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

export function searchFeed(query: string | null | undefined): Feed | null {
  const q = (query ?? "").trim().slice(0, 100);
  return q ? { kind: "search", query: q } : null;
}

/** Query string identifying the feed (without `page`) — the /api/titles params and a React key. */
export function feedQuery(feed: Feed): string {
  const params = new URLSearchParams();
  if (feed.kind === "search") {
    params.set("q", feed.query);
  } else {
    params.set("type", feed.type);
    if (feed.list) params.set("list", feed.list);
    if (feed.genre) params.set("genre", String(feed.genre));
    if (feed.provider) params.set("provider", String(feed.provider));
  }
  return params.toString();
}

export function parseFeedQuery(params: URLSearchParams): Feed | null {
  if (params.has("q")) return searchFeed(params.get("q"));
  const type = params.get("type");
  if (type !== "movie" && type !== "tv") return null;
  return browseFeed(type, { list: params.get("list"), genre: params.get("genre"), provider: params.get("provider") });
}

export function getFeedPage(feed: Feed, page: number): Promise<MediaPage> {
  if (feed.kind === "search") return searchMulti(feed.query, page);
  const { type, list, genre, provider } = feed;
  if (list && isListKey(type, list)) return getList(type, list, page);
  return discover(type, { genre: genre ?? undefined, provider: provider ?? undefined, page });
}
