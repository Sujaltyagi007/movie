import { cacheLife } from "next/cache";
import { LISTS, type ListKey, type Media, type MediaType } from "@/lib/catalog";

export { imageUrl, releaseYear } from "@/lib/catalog";
export type { Media, MediaType } from "@/lib/catalog";

const API_BASE = process.env.TMDB_API_BASE ?? "https://api.tmdb.org/3";
export const REGION = (process.env.TMDB_REGION ?? "US").toUpperCase();


class TmdbError extends Error {
  constructor(public status: number, path: string) {
    super(`TMDB request to ${path} failed with status ${status}`);
  }
}

function tmdbAuth(): { headers: Record<string, string>; query: Record<string, string> } {
  const token = process.env.TMDB_READ_ACCESS;
  if (token) return { headers: { Authorization: `Bearer ${token}` }, query: {} };
  const apiKey = process.env.TMDB_API_KEY;
  if (apiKey) return { headers: {}, query: { api_key: apiKey } };
  throw new Error("TMDB credentials missing: set TMDB_READ_ACCESS (or TMDB_API_KEY) in .env.");
}

const MAX_IN_FLIGHT = 8;
let inFlight = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_IN_FLIGHT) await new Promise<void>((resolve) => waiting.push(resolve));
  inFlight++;
  try { return await task(); }
  finally { inFlight--; waiting.shift()?.(); }
}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const auth = tmdbAuth();
  const url = new URL(API_BASE + path);
  url.searchParams.set("language", "en-US");
  for (const [key, value] of Object.entries({ ...params, ...auth.query })) url.searchParams.set(key, value);

  const init = { headers: { accept: "application/json", ...auth.headers } };
  for (let attempt = 0; ; attempt++) {
    let result: { ok: true; data: T } | { ok: false; status: number };
    try {
      result = await withSlot(async () => {
        const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
        return res.ok ? { ok: true as const, data: (await res.json()) as T } : { ok: false as const, status: res.status };
      });
    } catch (error) {
      if (attempt >= 5) throw error;
      await new Promise((r) => setTimeout(r, 300 * 2 ** attempt * (0.75 + Math.random() / 2)));
      continue;
    }
    if (result.ok) return result.data;
    throw new TmdbError(result.status, path);
  }
}

async function orNotFound<T>(id: string, load: () => Promise<T>): Promise<T | null> {
  if (!/^\d+$/.test(id)) return null;
  try {
    return await load();
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) return null;
    throw error;
  }
}


type RawItem = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
};

type Page = { results: RawItem[]; total_pages: number; page: number };

export type MediaPage = { items: Media[]; page: number; totalPages: number };

function toMedia(raw: RawItem, fallbackType?: MediaType): Media | null {
  const mediaType = raw.media_type ?? fallbackType;
  if (mediaType !== "movie" && mediaType !== "tv") return null; // e.g. "person" in multi-search
  return {
    id: raw.id,
    mediaType,
    title: raw.title ?? raw.name ?? "Untitled",
    overview: raw.overview ?? "",
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    rating: raw.vote_average ?? 0,
    date: raw.release_date ?? raw.first_air_date ?? "",
    genreIds: raw.genre_ids ?? [],
  };
}

function toMediaList(raws: RawItem[], fallbackType?: MediaType): Media[] {
  return raws.map((r) => toMedia(r, fallbackType)).filter((m): m is Media => m !== null);
}

function toPage(data: Page, fallbackType?: MediaType): MediaPage {
  return { items: toMediaList(data.results, fallbackType), page: data.page, totalPages: Math.min(data.total_pages, 500) };
}


export async function getTrending(type: "all" | MediaType, window: "day" | "week"): Promise<Media[]> {
  "use cache";
  cacheLife("hours");
  const data = await tmdb<Page>(`/trending/${type}/${window}`);
  return toMediaList(data.results, type === "all" ? undefined : type);
}

export async function getList<T extends MediaType>(type: T, list: ListKey<T>, page = 1): Promise<MediaPage> {
  "use cache";
  cacheLife("hours");
  const path = (LISTS[type] as Record<string, { path: string }>)[list as string].path;
  return toPage(await tmdb<Page>(path, { page: String(page), region: REGION }), type);
}

export async function discover(type: MediaType, filters: { genre?: number; provider?: number; page?: number }): Promise<MediaPage> {
  "use cache";
  cacheLife("hours");
  const params: Record<string, string> = {
    sort_by: "popularity.desc", include_adult: "false",
    page: String(filters.page ?? 1), "vote_count.gte": "20",
  };
  if (filters.genre) params.with_genres = String(filters.genre);
  if (filters.provider) {
    params.with_watch_providers = String(filters.provider);
    params.watch_region = REGION;
    params.with_watch_monetization_types = "flatrate";
  }
  return toPage(await tmdb<Page>(`/discover/${type}`, params), type);
}

export async function searchMulti(query: string, page = 1): Promise<MediaPage> {
  "use cache";
  cacheLife("hours");
  return toPage(await tmdb<Page>("/search/multi", { query, include_adult: "false", page: String(page) }));
}

export type Genre = { id: number; name: string };

export async function getGenres(type: MediaType): Promise<Genre[]> {
  "use cache";
  cacheLife("weeks");
  return (await tmdb<{ genres: Genre[] }>(`/genre/${type}/list`)).genres;
}

export async function getGenreNames(): Promise<Record<number, string>> {
  const [movie, tv] = await Promise.all([getGenres("movie"), getGenres("tv")]);
  return Object.fromEntries([...tv, ...movie].map((g) => [g.id, g.name]));
}

export type Provider = { id: number; name: string; logoPath: string | null };

const NON_SUBSCRIPTION = /\b(store|channel|amazon video|google play|youtube|fandango|vudu|microsoft|rakuten|justwatch|tubi|pluto|plex|freevee|roku channel)\b/i;

export async function getProviders(type: MediaType, limit = 12): Promise<Provider[]> {
  "use cache";
  cacheLife("weeks");
  const data = await tmdb<{ results: { provider_id: number; provider_name: string; logo_path: string | null; display_priority: number; display_priorities?: Record<string, number> }[]; }>(`/watch/providers/${type}`, { watch_region: REGION });
  return data.results.filter((p) => !NON_SUBSCRIPTION.test(p.provider_name))
    .map((p) => ({ p, rank: p.display_priorities?.[REGION] ?? p.display_priority }))
    .sort((a, b) => a.rank - b.rank).slice(0, limit)
    .map(({ p }) => ({ id: p.provider_id, name: p.provider_name, logoPath: p.logo_path }));
}


export function serviceName(name: string) {
  return name.replace(/\s+((standard|basic|premium|essential)\s+)?with ads$/i, "").replace(/\s+(free|premium|essential|basic|standard)$/i, "").trim();
}

type RegionProviders = Partial<Record<"flatrate" | "free" | "ads", { provider_id: number; provider_name: string; logo_path: string | null; display_priority: number }[]>>;

export async function getStreamingProviders(type: MediaType, id: number): Promise<Provider[]> {
  "use cache";
  cacheLife("days");
  try {
    const data = await tmdb<{ results: Record<string, RegionProviders> }>(`/${type}/${id}/watch/providers`);
    const region = data.results?.[REGION];
    if (!region) return [];
    const all = [...(region.flatrate ?? []), ...(region.free ?? []), ...(region.ads ?? [])].sort((a, b) => a.display_priority - b.display_priority);
    const seen = new Set<string>();
    const out: Provider[] = [];
    for (const p of all) {
      if (/\b(amazon|apple tv|roku premium) channel$/i.test(p.provider_name)) continue;
      const name = serviceName(p.provider_name);
      if (seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      out.push({ id: p.provider_id, name, logoPath: p.logo_path });
    }
    return out;
  } catch {
    return []; // Availability is a nice-to-have on result cards; never fail the page over it.
  }
}

export async function getTopProviders(limit = 10): Promise<Provider[]> {
  const [movie, tv] = await Promise.all([getProviders("movie", limit).catch(() => []), getProviders("tv", limit).catch(() => [])]);
  const byName = new Map<string, Provider>();
  for (let i = 0; i < Math.max(movie.length, tv.length); i++) {
    for (const p of [movie[i], tv[i]]) {
      const name = p && serviceName(p.name);
      if (p && name && !byName.has(name.toLowerCase())) byName.set(name.toLowerCase(), { ...p, name });
    }
  }
  return [...byName.values()].slice(0, limit);
}

type Video = { key: string; site: string; type: string; official: boolean; iso_639_1?: string; name?: string };

export function pickTrailer(videos: Video[]): Video | undefined {
  const youtube = videos.filter((v) => v.site === "YouTube");
  return youtube.find((v) => v.type === "Trailer" && v.official) ?? youtube.find((v) => v.type === "Trailer") ?? youtube[0];
}

export type Trailer = { key: string; language: string; name: string };

const DETAIL_VIDEO_LANGUAGES = "en,null";
const EXTRA_TRAILER_LANGUAGES = ["hi", "es", "fr", "de", "ja", "ko", "it", "pt", "zh", "ta", "te", "ml", "kn", "bn", "mr", "pa", "ar", "ru", "tr", "th", "id", "pl", "nl", "sv"];
const VIDEO_LANGUAGES_PER_REQUEST = 5;

async function getExtraLanguageVideos(type: MediaType, id: string): Promise<Video[]> {
  "use cache";
  cacheLife("days");
  const batches: string[][] = [];
  for (let i = 0; i < EXTRA_TRAILER_LANGUAGES.length; i += VIDEO_LANGUAGES_PER_REQUEST) {
    batches.push(EXTRA_TRAILER_LANGUAGES.slice(i, i + VIDEO_LANGUAGES_PER_REQUEST));
  }
  const results = await Promise.all(batches.map((langs) => tmdb<{ results: Video[] }>(`/${type}/${id}/videos`, { include_video_language: langs.join(",") }).then((r) => r.results).catch(() => [] as Video[])));
  return results.flat();
}

function mergeVideos(...lists: Video[][]): Video[] {
  const byKey = new Map<string, Video>();
  for (const v of lists.flat()) if (!byKey.has(v.key)) byKey.set(v.key, v);
  return [...byKey.values()];
}

const VIDEO_RANK = (v: Video) => (v.type === "Trailer" ? (v.official ? 0 : 1) : v.type === "Teaser" ? (v.official ? 2 : 3) : 9);

export function pickTrailers(videos: Video[], originalLanguage = ""): Trailer[] {
  const best = new Map<string, Video>();
  for (const v of videos) {
    if (v.site !== "YouTube" || VIDEO_RANK(v) === 9) continue;
    const lang = v.iso_639_1 && v.iso_639_1 !== "xx" ? v.iso_639_1 : "";
    const current = best.get(lang);
    if (!current || VIDEO_RANK(v) < VIDEO_RANK(current)) best.set(lang, v);
  }
  const order = (lang: string) => (lang === "en" ? 0 : lang === originalLanguage ? 1 : lang === "" ? 3 : 2);
  return [...best.entries()]
    .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
    .map(([language, v]) => ({ key: v.key, language, name: v.name ?? "Trailer" }));
}

export type CastMember = { id: number; name: string; character: string; profile_path: string | null };
type ProviderEntry = { provider_id: number; provider_name: string; logo_path: string | null };
type RawWatch = { results: Record<string, { link?: string; flatrate?: ProviderEntry[]; rent?: ProviderEntry[]; buy?: ProviderEntry[] }> };

export type WatchOptions = { link: string | null; stream: Provider[]; rent: Provider[]; buy: Provider[] };

function toWatchOptions(raw: RawWatch | undefined): WatchOptions | null {
  const region = raw?.results?.[REGION];
  if (!region) return null;
  // One entry per service: "Netflix Standard with Ads" folds into "Netflix".
  const map = (list?: ProviderEntry[]) => {
    const seen = new Set<string>();
    return (list ?? []).flatMap((p) => {
      const name = serviceName(p.provider_name);
      if (seen.has(name.toLowerCase())) return [];
      seen.add(name.toLowerCase());
      return [{ id: p.provider_id, name, logoPath: p.logo_path }];
    });
  };
  const options = { link: region.link ?? null, stream: map(region.flatrate), rent: map(region.rent), buy: map(region.buy) };
  return options.stream.length + options.rent.length + options.buy.length ? options : null;
}

type RawDetailsBase = {
  id: number;
  overview: string;
  tagline?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  original_language?: string;
  genres: Genre[];
  credits: { cast: CastMember[] };
  videos: { results: Video[] };
  recommendations: { results: RawItem[] };
  similar: { results: RawItem[] };
  "watch/providers"?: RawWatch;
};

export type Details = {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  tagline: string;
  posterPath: string | null;
  backdropPath: string | null;
  rating: number;
  voteCount: number;
  /** Age rating for REGION, e.g. "PG-13" or "TV-MA"; empty when TMDB has none. */
  certification: string;
  date: string;
  genres: Genre[];
  cast: CastMember[];
  trailerKey: string | null;
  /** The trailer in every language TMDB has one for (first = default). */
  trailers: Trailer[];
  /** ISO 639-1 code of the original audio, e.g. "en", "te" ("" if unknown). */
  originalLanguage: string;
  imdbId?: string | null;
  related: Media[];
  watch: WatchOptions | null;
};

type RawReleaseDates = { results: { iso_3166_1: string; release_dates: { certification: string; type: number }[] }[] };
type RawContentRatings = { results: { iso_3166_1: string; rating: string }[] };

/** Movie age rating for REGION, preferring the theatrical release (type 3), then any release. */
function movieCertification(raw: RawReleaseDates | undefined): string {
  const dates = raw?.results.find((r) => r.iso_3166_1 === REGION)?.release_dates ?? [];
  const rated = dates.filter((d) => d.certification.trim());
  return (rated.find((d) => d.type === 3) ?? rated[0])?.certification.trim() ?? "";
}

function tvCertification(raw: RawContentRatings | undefined): string {
  return raw?.results.find((r) => r.iso_3166_1 === REGION)?.rating.trim() ?? "";
}

function toDetails(raw: RawDetailsBase, mediaType: MediaType, title: string, date: string, certification: string): Details {
  const recs = toMediaList(raw.recommendations.results, mediaType);
  return {
    id: raw.id,
    mediaType,
    title,
    overview: raw.overview,
    tagline: raw.tagline ?? "",
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    rating: raw.vote_average,
    voteCount: raw.vote_count ?? 0,
    certification,
    date,
    genres: raw.genres,
    cast: raw.credits.cast.slice(0, 15),
    trailerKey: pickTrailer(raw.videos.results.filter((v) => !v.iso_639_1 || v.iso_639_1 === "en"))?.key ?? pickTrailer(raw.videos.results)?.key ?? null,
    trailers: pickTrailers(raw.videos.results, raw.original_language),
    originalLanguage: raw.original_language ?? "",
    related: (recs.length ? recs : toMediaList(raw.similar.results, mediaType)).filter((m) => m.posterPath).slice(0, 18),
    watch: toWatchOptions(raw["watch/providers"]),
  };
}

const DETAIL_APPEND = "credits,videos,recommendations,similar,watch/providers";

export type MovieDetails = Details & { mediaType: "movie"; runtime: number | null; imdbId: string | null };

export async function getMovie(id: string): Promise<MovieDetails | null> {
  "use cache";
  cacheLife("days");
  return orNotFound(id, async () => {
    const [raw, extraVideos] = await Promise.all([
      tmdb<RawDetailsBase & { title: string; release_date: string; runtime: number | null; imdb_id?: string | null; release_dates?: RawReleaseDates }>(`/movie/${id}`, {
        append_to_response: `${DETAIL_APPEND},release_dates`,
        include_video_language: DETAIL_VIDEO_LANGUAGES,
      }),
      getExtraLanguageVideos("movie", id),
    ]);
    raw.videos.results = mergeVideos(raw.videos.results, extraVideos);
    return { ...toDetails(raw, "movie", raw.title, raw.release_date, movieCertification(raw.release_dates)), mediaType: "movie", runtime: raw.runtime, imdbId: raw.imdb_id ?? null };
  });
}

export type Season = { id: number; name: string; number: number; episodes: number; date: string; posterPath: string | null };

export type TvDetails = Details & {
  mediaType: "tv";
  imdbId: string | null;
  status: string;
  lastAirDate: string;
  seasonCount: number;
  episodeCount: number;
  episodeRuntime: number | null;
  networks: Provider[];
  creators: string[];
  seasons: Season[];
};

export async function getTv(id: string): Promise<TvDetails | null> {
  "use cache";
  cacheLife("days");
  return orNotFound(id, async () => {
    const rawRequest = tmdb<
      RawDetailsBase & {
        name: string; first_air_date: string;
        last_air_date: string | null;
        status: string; number_of_seasons: number;
        number_of_episodes: number; episode_run_time: number[];
        networks: { id: number; name: string; logo_path: string | null }[];
        created_by: { name: string }[];
        seasons: { id: number; name: string; season_number: number; episode_count: number; air_date: string | null; poster_path: string | null }[];
        content_ratings?: RawContentRatings;
        external_ids?: { imdb_id?: string | null };
      }
    >(`/tv/${id}`, { append_to_response: `${DETAIL_APPEND},content_ratings,external_ids`, include_video_language: DETAIL_VIDEO_LANGUAGES });
    const [raw, extraVideos] = await Promise.all([rawRequest, getExtraLanguageVideos("tv", id)]);
    raw.videos.results = mergeVideos(raw.videos.results, extraVideos);
    return {
      ...toDetails(raw, "tv", raw.name, raw.first_air_date, tvCertification(raw.content_ratings)),
      mediaType: "tv",
      imdbId: raw.external_ids?.imdb_id ?? null,
      status: raw.status,
      lastAirDate: raw.last_air_date ?? "",
      seasonCount: raw.number_of_seasons,
      episodeCount: raw.number_of_episodes,
      episodeRuntime: raw.episode_run_time[0] ?? null,
      networks: raw.networks.map((n) => ({ id: n.id, name: n.name, logoPath: n.logo_path })), creators: raw.created_by.map((c) => c.name),
      seasons: raw.seasons.filter((s) => s.episode_count > 0).sort((a, b) => (a.season_number || 999) - (b.season_number || 999))
        .map((s) => ({ id: s.id, name: s.name, number: s.season_number, episodes: s.episode_count, date: s.air_date ?? "", posterPath: s.poster_path })),
    };
  });
}


export type BannerExtras = {
  runtime: number | null;
  genres: string[];
  trailerKey: string | null;
  logo: { path: string; width: number; height: number } | null;
};

export async function getBannerExtras(type: MediaType, id: number): Promise<BannerExtras> {
  "use cache";
  cacheLife("days");
  const data = await tmdb<{
    runtime?: number | null;
    episode_run_time?: number[]; genres: { name: string }[]; videos: { results: Video[] };
    images: { logos: { file_path: string; width: number; height: number; iso_639_1: string | null }[] };
  }>(`/${type}/${id}`, { append_to_response: "videos,images", include_image_language: "en,null" });

  const logo = data.images.logos.find((l) => l.iso_639_1 === "en") ?? data.images.logos[0];
  return {
    runtime: data.runtime ?? data.episode_run_time?.[0] ?? null,
    genres: data.genres.map((g) => g.name),
    trailerKey: pickTrailer(data.videos.results)?.key ?? null,
    logo: logo ? { path: logo.file_path, width: logo.width, height: logo.height } : null,
  };
}
