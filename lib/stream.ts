const VAPI_BASE_URL = "https://vidsrc.mov/vapi";
const STREAM_BASE_URL = "https://vidsrc.mov/embed";

export type StreamMediaId = number | string;

export function withSubtitle(embedUrl: string, subInfo?: string | null): string {
  const trimmed = subInfo?.trim();
  if (!trimmed) return embedUrl;
  let parsed: URL;
  try { parsed = new URL(trimmed) }
  catch { throw new Error("Invalid subtitle URL") }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") { throw new Error("Invalid subtitle URL protocol") }
  const target = new URL(embedUrl);
  target.searchParams.set("sub.info", parsed.toString());
  return target.toString();
}

export const STREAM_MOVIE = (id: StreamMediaId, subInfo?: string | null) => withSubtitle(`${STREAM_BASE_URL}/movie/${encodeURIComponent(String(id))}`, subInfo);
export const STREAM_EPISODE = (id: StreamMediaId, season: number, episode: number, subInfo?: string | null) => withSubtitle(`${STREAM_BASE_URL}/tv/${encodeURIComponent(String(id))}/${season}/${episode}`, subInfo);
export const STREAM_MOVIE_LIST = (page = 15) => `${VAPI_BASE_URL}/movie/new/${page}`;
export const STREAM_TV_LATEST = `${VAPI_BASE_URL}/episode/latest`;
