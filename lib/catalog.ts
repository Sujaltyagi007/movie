export type MediaType = "movie" | "tv";

export type Media = {
  id: number;
  mediaType: MediaType;
  title: string; overview: string;
  rating: number; date: string; genreIds: number[];
  posterPath: string | null; backdropPath: string | null;
  providers?: { id: number; name: string; logoPath: string | null }[];
};

export const MOVIE_LISTS = {
  popular: { label: "Popular", title: "Popular movies", path: "/movie/popular" },
  now_playing: { label: "In Theaters", title: "In theaters now", path: "/movie/now_playing" },
  top_rated: { label: "Top Rated", title: "Top rated movies", path: "/movie/top_rated" },
  upcoming: { label: "Coming Soon", title: "Coming soon", path: "/movie/upcoming" },
} as const;

export const TV_LISTS = {
  popular: { label: "Popular", title: "Popular series", path: "/tv/popular" },
  airing_today: { label: "Airing Today", title: "Airing today", path: "/tv/airing_today" },
  on_the_air: { label: "On The Air", title: "On the air this week", path: "/tv/on_the_air" },
  top_rated: { label: "Top Rated", title: "Top rated series", path: "/tv/top_rated" },
} as const;

export const LISTS = { movie: MOVIE_LISTS, tv: TV_LISTS } as const;

export type ListKey<T extends MediaType> = keyof (typeof LISTS)[T];

export function isListKey<T extends MediaType>(type: T, value: unknown): value is ListKey<T> {
  return typeof value === "string" && Object.hasOwn(LISTS[type], value);
}

export function mediaHref(item: Pick<Media, "id" | "mediaType">) { return `/${item.mediaType}/${item.id}` }

/** Unique key for a title across movies and TV (ids overlap between the two). */
export function mediaKey(item: Pick<Media, "id" | "mediaType">) { return `${item.mediaType}-${item.id}` }

/** Streaming services per title, keyed by `mediaKey`. */
export type ProviderMap = Record<string, NonNullable<Media["providers"]>>;

export function releaseYear(date: string | undefined) { return date ? date.slice(0, 4) : "TBA" }

export function formatRuntime(minutes: number | null | undefined) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  return h ? `${h}h ${minutes % 60}m` : `${minutes}m`;
}

const IMAGE_BASE = "https://image.tmdb.org/t/p";
export type ImageSize = "w92" | "w154" | "w185" | "w300" | "w342" | "w500" | "w780" | "w1280" | "original";

export function imageUrl(path: string | null | undefined, size: ImageSize) {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}
