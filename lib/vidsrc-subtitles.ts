import { cacheLife } from "next/cache";
import { languageLabel, normalizeLanguage } from "@/lib/media-language";

const OPENSUBTITLES_BASE = "https://opensubtitles-v3.strem.io/subtitles";
const REQUEST_TIMEOUT_MS = 6000;
const MAX_LANGUAGES = 12;

export const VALID_IMDB_ID = /^tt\d+$/;

const EXTRA_THREE_LETTER: Record<string, string> = {
  mal: "ml",
  kan: "kn",
  mar: "mr",
  pan: "pa",
  guj: "gu",
  ori: "or",
  asm: "as",
  nep: "ne",
  sin: "si",
  tgl: "tl",
  msa: "ms",
  may: "ms",
  vie: "vi",
};

/** Priority languages requested first in the subtitle menu. */
const PRIORITY_LANGUAGES: Record<string, number> = {
  en: 0,
  hi: 1,
  ta: 2,
  te: 3,
  es: 4,
  fr: 5,
  de: 6,
  ar: 7,
  ja: 8,
  ko: 9,
};

export type ExternalSubtitleTrack = {
  id: string;
  langCode: string;
  label: string;
  url: string;
};

export type VidsrcSubtitleEntry = {
  file: string;
  label: string;
};

type RawOpenSubEntry = {
  id?: unknown;
  url?: unknown;
  lang?: unknown;
};

type RawOpenSubResponse = {
  subtitles?: unknown;
};

export function normalizeSubtitleLang(rawLang: unknown): string {
  if (typeof rawLang !== "string") return "";
  const cleaned = rawLang.trim().toLowerCase();
  if (!cleaned) return "";
  if (EXTRA_THREE_LETTER[cleaned]) return EXTRA_THREE_LETTER[cleaned];
  return normalizeLanguage(cleaned);
}

function isPublicHttpsOrigin(candidate: string): boolean {
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1" && host !== "::1" && host !== "[::1]";
  } catch {
    return false;
  }
}

export function resolvePublicOrigin(request: Request): string | null {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      if (isPublicHttpsOrigin(parsed.origin)) return parsed.origin;
    } catch { }
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost && forwardedProto === "https") {
    const origin = `https://${forwardedHost}`;
    if (isPublicHttpsOrigin(origin)) return origin;
  }

  try {
    const reqOrigin = new URL(request.url).origin;
    if (isPublicHttpsOrigin(reqOrigin)) return reqOrigin;
  } catch { }

  return null;
}

export function normalizeOpenSubtitlesTracks(rawSubtitles: unknown): ExternalSubtitleTrack[] {
  if (!Array.isArray(rawSubtitles)) return [];

  const byLang = new Map<string, ExternalSubtitleTrack>();
  for (const entry of rawSubtitles) {
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as RawOpenSubEntry;
    if (typeof raw.id !== "string" || !raw.id.trim()) continue;
    if (typeof raw.url !== "string" || !raw.url.trim()) continue;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(raw.url);
    } catch {
      continue;
    }
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") continue;

    const langCode = normalizeSubtitleLang(raw.lang);
    if (!langCode || byLang.has(langCode)) continue;

    byLang.set(langCode, {
      id: raw.id.trim().slice(0, 120),
      langCode,
      label: languageLabel(langCode),
      url: parsedUrl.protocol === "http:" ? `https://${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}` : parsedUrl.toString(),
    });
  }

  return Array.from(byLang.values()).sort((a, b) => {
    const rankA = PRIORITY_LANGUAGES[a.langCode] ?? 100;
    const rankB = PRIORITY_LANGUAGES[b.langCode] ?? 100;
    if (rankA !== rankB) return rankA - rankB;
    return a.label.localeCompare(b.label);
  }).slice(0, MAX_LANGUAGES);
}

async function fetchExternalSubtitlesCached(imdbId: string, season?: number, episode?: number): Promise<ExternalSubtitleTrack[]> {
  "use cache";
  cacheLife("hours");
  const path = season !== undefined && episode !== undefined ? `${OPENSUBTITLES_BASE}/series/${encodeURIComponent(`${imdbId}:${season}:${episode}`)}.json` : `${OPENSUBTITLES_BASE}/movie/${encodeURIComponent(imdbId)}.json`;
  const res = await fetch(path, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Subtitle lookup failed with status ${res.status}`);

  const data = (await res.json()) as RawOpenSubResponse;
  return normalizeOpenSubtitlesTracks(data?.subtitles);
}

export async function getExternalSubtitles(params: { imdbId: string; season?: number; episode?: number; }): Promise<ExternalSubtitleTrack[]> {
  if (!VALID_IMDB_ID.test(params.imdbId)) return [];
  try {
    return await fetchExternalSubtitlesCached(params.imdbId, params.season, params.episode);
  } catch (error) {
    console.warn("External subtitle lookup failed", { imdbId: params.imdbId, error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export function prioritizeSubtitleLanguage(
  tracks: ExternalSubtitleTrack[],
  preferredLang?: string | null,
): ExternalSubtitleTrack[] {
  const code = preferredLang?.trim().toLowerCase();
  if (!code) return tracks;
  const index = tracks.findIndex((t) => t.langCode.toLowerCase() === code);
  if (index <= 0) return tracks;
  return [tracks[index], ...tracks.slice(0, index), ...tracks.slice(index + 1)];
}

export function buildVidsrcSubtitlesManifestUrl(
  origin: string,
  params: { imdbId: string; season?: number; episode?: number; lang?: string },
): string {
  const url = new URL("/api/subtitles/vidsrc", origin);
  url.searchParams.set("id", params.imdbId);
  if (params.season !== undefined && params.episode !== undefined) {
    url.searchParams.set("season", String(params.season));
    url.searchParams.set("episode", String(params.episode));
  }
  if (params.lang?.trim()) {
    url.searchParams.set("lang", params.lang.trim());
  }
  return url.toString();
}

export function buildVidsrcSubtitleEntries(
  origin: string,
  params: { imdbId: string; season?: number; episode?: number },
  tracks: ExternalSubtitleTrack[],
): VidsrcSubtitleEntry[] {
  return tracks.map((track) => {
    const fileUrl = new URL("/api/subtitles/track", origin);
    fileUrl.searchParams.set("id", params.imdbId);
    fileUrl.searchParams.set("track", track.id);
    if (params.season !== undefined && params.episode !== undefined) {
      fileUrl.searchParams.set("season", String(params.season));
      fileUrl.searchParams.set("episode", String(params.episode));
    }
    return {
      file: fileUrl.toString(),
      label: track.label,
    };
  });
}
