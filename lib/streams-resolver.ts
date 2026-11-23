import { sealHlsTarget } from "@/lib/hls-token";
import { mint, resolveDetails } from "@/lib/resolver";
import { getMovie, getTv, imageUrl } from "@/lib/tmdb";
import { VALID_IMDB_ID } from "@/lib/vidsrc-subtitles";
import { getSubtitlesForLangs, type SubtitleTrackItem } from "@/lib/subtitles-lookup";
import { isHttpUrl, parseAudioRenditions, probeHlsSource, rankStreamSources, stripTokenParam, type AudioRendition, type AvailableStream, type DeadStreamSource, type RawStreamSource } from "@/lib/stream-sources";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const NEXUS_REFERER = "https://stellarconductornexus.com/";
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_PROBE_CANDIDATES = 4;

export type ResolvedStreamManifest = {
  success: boolean;
  fallback: boolean;
  available: boolean;
  video_url: string | null;
  error: string | null;
  configured: boolean;
  title: string | null;
  imdb_id: string | null;
  file_name: string | null;
  poster: string | null;
  sources: AvailableStream[];
  servers: AvailableStream[];
  tracks: SubtitleTrackItem[];
  deadSources: DeadStreamSource[];
};

type CachedManifestEntry = {
  expiresAt: number;
  manifest: ResolvedStreamManifest;
  rawLiveUrls: Array<{ rawUrl: string; needsMint: boolean }>;
  audioRenditions: AudioRendition[] | null;
  apiData: Record<string, unknown>;
  apiTok: string;
  vsData: Record<string, unknown>;
};

const manifestCache = new Map<string, CachedManifestEntry>();
const inFlightManifest = new Map<string, Promise<CachedManifestEntry>>();

function buildCacheKey(type: string, id: string, season?: number, episode?: number): string {
  return type === "tv" ? `${type}/${id}/${season ?? 1}/${episode ?? 1}` : `${type}/${id}`;
}

function normalizeHostedEntries(raw: unknown): RawStreamSource[] {
  if (!Array.isArray(raw)) return [];
  const entries: RawStreamSource[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (!isHttpUrl(rec.url)) continue;
    const rawHost = typeof rec.host === "string" && rec.host.trim() ? rec.host.trim() : new URL(rec.url).host;
    entries.push({
      host: rawHost,
      url: rec.url.trim(),
      ...(typeof rec.label === "string" && rec.label.trim() ? { label: rec.label.trim() } : {}),
      ...(typeof rec.language === "string" && rec.language.trim() ? { language: rec.language.trim() } : {}),
      ...(typeof rec.fileName === "string" && rec.fileName.trim() ? { fileName: rec.fileName.trim() } : {}),
    });
  }
  return entries;
}

async function fetchHostedStreams(baseUrl: string, type: string, id: string, season?: number, episode?: number): Promise<RawStreamSource[]> {
  const upstream = new URL(`${baseUrl.replace(/\/+$/, "")}/streams/${type}/${id}`);
  if (type === "tv" && season !== undefined) upstream.searchParams.set("season", String(season));
  if (type === "tv" && episode !== undefined) upstream.searchParams.set("episode", String(episode));

  const res = await fetch(upstream.toString(), {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) {
    throw new Error(`Hosted upstream returned ${res.status}`);
  }
  const data = (await res.json().catch(() => ({}))) as { sources?: unknown; servers?: unknown };
  return normalizeHostedEntries(data.sources ?? data.servers);
}

async function probeCandidate(
  rawUrl: string,
  needsMint: boolean,
  apiData: Record<string, unknown> = {},
  apiTok = "",
  vsData: Record<string, unknown> = {},
): Promise<{ ok: true; cleanUrl: string; body: string } | { ok: false; reason: string }> {
  const cleanUrl = stripTokenParam(rawUrl);
  let probeTarget = cleanUrl;
  let headers: Record<string, string> | undefined;

  if (needsMint) {
    try {
      const token = await mint(cleanUrl, apiData, apiTok, vsData);
      if (token) {
        const withTok = new URL(cleanUrl);
        withTok.searchParams.set("token", token);
        probeTarget = withTok.toString();
      }
      headers = { "User-Agent": UA, Referer: NEXUS_REFERER };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "Token mint failed",
      };
    }
  }

  const probe = await probeHlsSource(probeTarget, headers);
  return probe.ok ? { ok: true, cleanUrl, body: probe.body } : probe;
}

async function resolveAndProbe(type: "movie" | "tv", id: string, season?: number, episode?: number): Promise<CachedManifestEntry> {
  const key = buildCacheKey(type, id, season, episode);
  const existing = manifestCache.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return existing;
  }
  const active = inFlightManifest.get(key);
  if (active) {
    return active;
  }

  const promise = resolveAndProbeUncached(key, type, id, season, episode);
  inFlightManifest.set(key, promise);
  try {
    return await promise;
  } finally {
    if (inFlightManifest.get(key) === promise) {
      inFlightManifest.delete(key);
    }
  }
}

async function resolveAndProbeUncached(
  key: string,
  type: "movie" | "tv",
  id: string,
  season?: number,
  episode?: number,
): Promise<CachedManifestEntry> {

  const tmdbPromise = (type === "movie" ? getMovie(id) : getTv(id)).catch(() => null);

  let resolverMeta: {
    title: string | null;
    imdbId: string | null;
    fileName: string | null;
    backdrop: string | null;
  } = { title: null, imdbId: null, fileName: null, backdrop: null };
  let candidates: Array<RawStreamSource & { needsMint: boolean }> = [];
  let apiData: Record<string, unknown> = {};
  let apiTok = "";
  let vsData: Record<string, unknown> = {};
  let lastError: string | null = null;

  try {
    const resolved = await resolveDetails(
      type,
      Number(id),
      type === "tv" ? (season ?? 1) : undefined,
      type === "tv" ? (episode ?? 1) : undefined,
    );
    resolverMeta = {
      title: resolved.title,
      imdbId: resolved.imdbId,
      fileName: resolved.fileName,
      backdrop: resolved.backdrop,
    };
    apiData = resolved._apiData ?? {};
    apiTok = resolved._apiTok ?? "";
    vsData = resolved._vsData ?? {};
    candidates = resolved.sources.map((s) => ({
      host: s.host,
      url: s.raw,
      fileName: resolved.fileName ?? undefined,
      needsMint: true,
    }));
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Stream resolver failed";
    console.warn(`[streams] resolver failed for ${key}:`, lastError);
  }

  const baseUrl = process.env.MEDIA_API_URL?.trim();
  if (candidates.length === 0 && isHttpUrl(baseUrl)) {
    try {
      const hosted = await fetchHostedStreams(baseUrl, type, id, season, episode);
      candidates = hosted.map((s) => ({ ...s, needsMint: false }));
    } catch (error) {
      const hostedMsg = error instanceof Error ? error.message : "Hosted fallback failed";
      lastError = lastError ?? hostedMsg;
      console.warn(`[streams] hosted fallback failed for ${key}:`, hostedMsg);
    }
  }

  const ranked = rankStreamSources(candidates, resolverMeta.fileName).slice(0, MAX_PROBE_CANDIDATES);
  const needsMintByHost = new Map(candidates.map((c) => [c.host, c.needsMint]));

  const probeResults = await Promise.all(
    ranked.map(async (source) => {
      const needsMint = needsMintByHost.get(source.host) ?? true;
      const probe = await probeCandidate(source.url, needsMint, apiData, apiTok, vsData);
      return { source, needsMint, probe };
    }),
  );

  const liveSources: AvailableStream[] = [];
  const rawLiveUrls: Array<{ rawUrl: string; needsMint: boolean }> = [];
  const deadSources: DeadStreamSource[] = [];
  let audioRenditions: AudioRendition[] | null = null;

  const ctx = type === "tv" ? `${type}:${id}:${season ?? 1}:${episode ?? 1}` : `${type}:${id}`;
  for (const item of probeResults) {
    if (item.probe.ok) {
      const position = liveSources.length + 1;
      const serverName = `Server ${position}`;
      const proxiedUrl = sealHlsTarget(item.probe.cleanUrl, ctx);
      if (audioRenditions === null) {
        audioRenditions = parseAudioRenditions(item.probe.body, item.probe.cleanUrl, (raw) =>
          sealHlsTarget(raw, ctx),
        );
      }
      liveSources.push({
        id: position,
        server: serverName,
        host: serverName,
        height: item.source.height,
        audioScore: item.source.audioScore,
        position,
        url: proxiedUrl,
        type: "application/vnd.apple.mpegurl",
        ...(item.source.label ? { label: item.source.label } : {}),
        ...(item.source.language ? { language: item.source.language } : {}),
      });
      rawLiveUrls.push({ rawUrl: item.probe.cleanUrl, needsMint: item.needsMint });
    } else {
      deadSources.push({ server: `Server ${deadSources.length + 1}`, reason: item.probe.reason });
    }
  }

  const tmdb = await tmdbPromise;
  const title = tmdb?.title ?? resolverMeta.title;
  const imdbId = tmdb?.imdbId ?? resolverMeta.imdbId;
  const poster = imageUrl(tmdb?.posterPath ?? null, "w500") ?? resolverMeta.backdrop;
  const tracks = imdbId && VALID_IMDB_ID.test(imdbId) ? await getSubtitlesForLangs({ imdbId, langs: ["eng"], season: type === "tv" ? season : undefined, episode: type === "tv" ? episode : undefined }).catch(() => []) : [];
  const success = liveSources.length > 0;
  const manifest: ResolvedStreamManifest = {
    success, fallback: !success, available: success, video_url: liveSources[0]?.url ?? null,
    error: success ? null : (lastError ?? deadSources[0]?.reason ?? "No live stream sources available"),
    configured: true, title, imdb_id: imdbId, file_name: null,
    poster, sources: liveSources, servers: liveSources, tracks, deadSources
  };

  const entry: CachedManifestEntry = { expiresAt: Date.now() + CACHE_TTL_MS, manifest, rawLiveUrls, audioRenditions, apiData, apiTok, vsData };
  if (success) manifestCache.set(key, entry);
  return entry;
}

export async function getStreamManifest(type: "movie" | "tv", id: string, season?: number, episode?: number): Promise<ResolvedStreamManifest> {
  const entry = await resolveAndProbe(type, id, season, episode);
  return entry.manifest;
}

export async function getAudioRenditionsForTitle(type: "movie" | "tv", id: string, season?: number, episode?: number,): Promise<AudioRendition[]> {
  const entry = await resolveAndProbe(type, id, season, episode);
  if (entry.audioRenditions !== null) return entry.audioRenditions;
  const first = entry.rawLiveUrls[0];
  if (!first) return [];

  let fetchUrl = first.rawUrl;
  let headers: Record<string, string> | undefined;
  if (first.needsMint) {
    try {
      const token = await mint(first.rawUrl, entry.apiData, entry.apiTok, entry.vsData);
      if (token) {
        const withTok = new URL(first.rawUrl);
        withTok.searchParams.set("token", token);
        fetchUrl = withTok.toString();
      }
      headers = { "User-Agent": UA, Referer: NEXUS_REFERER };
    } catch {
      return [];
    }
  }

  try {
    const res = await fetch(fetchUrl, { headers, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const master = await res.text();
    const ctx = type === "tv" ? `${type}:${id}:${season ?? 1}:${episode ?? 1}` : `${type}:${id}`;
    return parseAudioRenditions(master, first.rawUrl, (raw) => sealHlsTarget(raw, ctx));
  } catch {
    return [];
  }
}
