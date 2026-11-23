import { languageLabel, normalizeLanguage } from "@/lib/media-language";
import { VALID_IMDB_ID } from "@/lib/vidsrc-subtitles";

const OPENSUBTITLES_BASE = "https://opensubtitles-v3.strem.io/subtitles";
const REQUEST_TIMEOUT_MS = 6000;
const SUBTITLE_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_TRACKS_PER_LANG = 3;

const ONE_TO_THREE: Record<string, string> = {
  en: "eng",
  es: "spa",
  fr: "fre",
  de: "ger",
  it: "ita",
  pt: "por",
  "pt-br": "pob",
  ru: "rus",
  ja: "jpn",
  zh: "zho",
  ko: "kor",
  hi: "hin",
  ar: "ara",
  nl: "dut",
  sv: "swe",
  pl: "pol",
  tr: "tur",
  el: "ell",
  cs: "cze",
  hu: "hun",
  da: "dan",
  fi: "fin",
  no: "nor",
  ro: "rum",
  he: "heb",
  th: "tha",
  id: "ind",
  vi: "vie",
  uk: "ukr",
  ta: "tam",
  te: "tel",
  bn: "ben",
  ur: "urd",
  fa: "per",
  ca: "cat",
  hr: "hrv",
  sr: "srp",
  bg: "bul",
};

const EXTRA_THREE_TO_ONE: Record<string, string> = {
  pob: "pt-BR",
  spl: "es",
  alb: "sq",
  mac: "mk",
  geo: "ka",
  est: "et",
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
};

export type SubtitleTrackItem = {
  id: string;
  language: string;
  label: string;
  url: string;
};

type RawOpenSubEntry = {
  id?: unknown;
  url?: unknown;
  lang?: unknown;
  movieReleaseName?: unknown;
  subtitleFileName?: unknown;
};

type CachedRawEntry = {
  id: string;
  iso1: string;
  label: string;
  upstreamUrl: string;
};

const rawSubtitleCache = new Map<string, { expiresAt: number; entries: CachedRawEntry[] }>();
const inFlightSubtitles = new Map<string, Promise<CachedRawEntry[]>>();

export function normalizeToIso1(rawLang: unknown): string {
  if (typeof rawLang !== "string") return "";
  const cleaned = rawLang.trim().toLowerCase();
  if (!cleaned) return "";
  if (EXTRA_THREE_TO_ONE[cleaned]) return EXTRA_THREE_TO_ONE[cleaned];
  return normalizeLanguage(cleaned);
}

export function toIso3(lang: string): string {
  const iso1 = normalizeToIso1(lang).toLowerCase();
  if (iso1 && ONE_TO_THREE[iso1]) return ONE_TO_THREE[iso1];
  const cleaned = lang.trim().toLowerCase();
  return cleaned;
}

async function fetchRawOpenSubtitles(imdbId: string, season?: number, episode?: number): Promise<CachedRawEntry[]> {
  if (!VALID_IMDB_ID.test(imdbId)) return [];
  const cacheKey = season !== undefined && episode !== undefined ? `${imdbId}:${season}:${episode}` : imdbId;
  const cached = rawSubtitleCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) { return cached.entries }
  const active = inFlightSubtitles.get(cacheKey);
  if (active) return active;

  const promise = (async () => {
    const path = season !== undefined && episode !== undefined ? `${OPENSUBTITLES_BASE}/series/${encodeURIComponent(`${imdbId}:${season}:${episode}`)}.json` : `${OPENSUBTITLES_BASE}/movie/${encodeURIComponent(imdbId)}.json`;

    const res = await fetch(path, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status === 404) {
      rawSubtitleCache.set(cacheKey, { expiresAt: Date.now() + SUBTITLE_CACHE_TTL_MS, entries: [] });
      return [];
    }
    if (!res.ok) { throw new Error(`Subtitle lookup failed with status ${res.status}`) }

    const data = (await res.json()) as { subtitles?: unknown };
    const list = Array.isArray(data?.subtitles) ? data.subtitles : [];
    const entries: CachedRawEntry[] = [];
    const seenIds = new Set<string>();

    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const raw = item as RawOpenSubEntry;
      if (typeof raw.id !== "string" || !raw.id.trim()) continue;
      if (typeof raw.url !== "string" || !raw.url.trim()) continue;
      const id = raw.id.trim().slice(0, 120);
      if (seenIds.has(id)) continue;

      let parsedUrl: URL;
      try { parsedUrl = new URL(raw.url.trim()) }
      catch { continue }
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") continue;
      const iso1 = normalizeToIso1(raw.lang);
      if (!iso1) continue;

      seenIds.add(id);
      const release = typeof raw.movieReleaseName === "string" && raw.movieReleaseName.trim() ? raw.movieReleaseName.trim() : typeof raw.subtitleFileName === "string" && raw.subtitleFileName.trim() ? raw.subtitleFileName.trim() : "";
      const langDisplay = languageLabel(iso1);
      entries.push({ id, iso1, label: release ? `${langDisplay} · ${release}` : langDisplay, upstreamUrl: parsedUrl.protocol === "http:" ? `https://${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}` : parsedUrl.toString() });
    }

    rawSubtitleCache.set(cacheKey, { expiresAt: Date.now() + SUBTITLE_CACHE_TTL_MS, entries });
    return entries;
  })();

  inFlightSubtitles.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    if (inFlightSubtitles.get(cacheKey) === promise) {
      inFlightSubtitles.delete(cacheKey);
    }
  }
}

export async function getSubtitlesForLangs({
  imdbId,
  langs = ["eng"],
  season,
  episode,
}: {
  imdbId: string;
  langs?: string[];
  season?: number;
  episode?: number;
}): Promise<SubtitleTrackItem[]> {
  if (!VALID_IMDB_ID.test(imdbId)) return [];
  const entries = await fetchRawOpenSubtitles(imdbId, season, episode);
  const requested = (langs.length > 0 ? langs : ["eng"])
    .map((l) => normalizeToIso1(l))
    .filter(Boolean);

  const uniqueLangs = [...new Set(requested)];
  const result: SubtitleTrackItem[] = [];

  for (const iso1 of uniqueLangs) {
    const matching = entries
      .filter((e) => e.iso1.toLowerCase() === iso1.toLowerCase() || e.iso1.split("-")[0].toLowerCase() === iso1.split("-")[0].toLowerCase())
      .slice(0, MAX_TRACKS_PER_LANG);

    for (const track of matching) {
      const url = new URL("/api/subtitles/track", "https://placeholder.invalid");
      url.searchParams.set("id", imdbId);
      url.searchParams.set("track", track.id);
      if (season !== undefined && episode !== undefined) {
        url.searchParams.set("season", String(season));
        url.searchParams.set("episode", String(episode));
      }
      result.push({
        id: track.id,
        language: track.iso1,
        label: track.label,
        url: `${url.pathname}${url.search}`,
      });
    }
  }

  return result;
}

export async function findOpenSubtitleTrackById({
  imdbId,
  trackId,
  season,
  episode,
}: {
  imdbId: string;
  trackId: string;
  season?: number;
  episode?: number;
}): Promise<{ id: string; url: string } | null> {
  const entries = await fetchRawOpenSubtitles(imdbId, season, episode);
  const matched = entries.find((e) => e.id === trackId);
  return matched ? { id: matched.id, url: matched.upstreamUrl } : null;
}
