import { cacheLife } from "next/cache";
import { languageFromFileName, normalizeLanguage } from "./media-language";

const ARCHIVE_BASE = "https://archive.org";
const REQUEST_TIMEOUT_MS = 6000;
const MIN_UNDATED_DURATION_SECONDS = 30 * 60;
const MIN_UNTIMED_SIZE_BYTES = 40 * 1024 * 1024;
const MAX_CANDIDATE_LOOKUPS = 3;

export type ArchiveVideoSource = {
  url: string;
  label: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  language: string;
  stem: string;
};

export type ArchiveSubtitle = {
  id: string;
  url: string;
  language: string;
  auto: boolean;
  stem: string;
};

export type PublicDomainMovie = {
  identifier: string;
  title: string;
  year: string | null;
  archiveUrl: string;
  durationSeconds: number | null;
  sources: ArchiveVideoSource[];
  audioLanguage: string;
  subtitles: ArchiveSubtitle[];
};

type ArchiveSearchDoc = {
  identifier?: string;
  title?: string | string[];
  year?: string | number;
};

type ArchiveSearchResponse = {
  response?: {
    docs?: ArchiveSearchDoc[];
  };
};

export type ArchiveFile = {
  name?: string;
  format?: string;
  size?: string | number;
  length?: string | number;
  width?: string | number;
  height?: string | number;
};

type ArchiveMetadataResponse = {
  is_dark?: boolean;
  metadata?: {
    identifier?: string;
    title?: string | string[];
    year?: string | number;
    date?: string;
    language?: string | string[];
  };
  files?: ArchiveFile[];
};

export function normalizeTitle(raw: string): string {
  return raw.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\(\s*\d{4}\s*\)|\[\s*\d{4}\s*\]/g, " ")
    .replace(/&/g, " and ").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function extractYear(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1880 && value <= 2100) {
    return value;
  }
  if (typeof value === "string") {
    const match = value.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
    if (match) return Number(match[1]);
  }
  return null;
}

export function parseDurationSeconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    return Number.isFinite(num) && num > 0 ? Math.round(num) : null;
  }

  const parts = trimmed.split(":").map(Number);
  if ((parts.length === 2 || parts.length === 3) && parts.every((n) => Number.isFinite(n) && n >= 0)) {
    const total = parts.reduce((acc, part) => acc * 60 + part, 0);
    return total > 0 ? Math.round(total) : null;
  }
  return null;
}

function parsePositiveInt(value: unknown): number | null {
  const num = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(num) && num > 0 ? Math.round(num) : null;
}

function sanitizeSearchPhrase(title: string): string {
  return title.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, " ").replace(/\s+/g, " ").trim();
}

function firstString(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

function titlesMatch(candidateTitle: string, targetTitle: string): boolean {
  const normCandidate = normalizeTitle(candidateTitle);
  const normTarget = normalizeTitle(targetTitle);
  if (!normCandidate || !normTarget) return false;
  if (normCandidate === normTarget) return true;

  const withoutTrailingYear = normCandidate.replace(/\s+(18\d{2}|19\d{2}|20\d{2})$/, "").trim();
  return withoutTrailingYear === normTarget;
}

function encodeArchivePath(identifier: string, fileName: string): string {
  const encodedSegments = fileName.split("/").filter(Boolean).map((segment) => encodeURIComponent(segment)).join("/");
  return `${ARCHIVE_BASE}/download/${encodeURIComponent(identifier)}/${encodedSegments}`;
}

function formatSourceLabel(file: ArchiveFile, height: number | null): string {
  const format = (file.format ?? "").toLowerCase();
  if (height && height >= 1080) return "1080p MP4";
  if (height && height >= 720) return "720p MP4";
  if (height && height >= 480) return "480p MP4";
  if (format.includes("512kb")) return "Compact (512kb)";
  if (format.includes("hd")) return "HD MP4";
  if (height) return `${height}p MP4`;
  return "MP4";
}

function sourcePriority(file: ArchiveFile, height: number | null, sizeBytes: number | null): number {
  const format = (file.format ?? "").toLowerCase();
  const isCompact = format.includes("512kb");
  const isH264 = format.includes("h.264") || format.includes("mpeg4");
  const resolutionScore = height ?? (isCompact ? 240 : 480);
  const sizeScore = sizeBytes ? Math.min(sizeBytes / (1024 * 1024), 4096) / 10000 : 0;
  return (isCompact ? 0 : 10000) + (isH264 ? 1000 : 0) + resolutionScore + sizeScore;
}

export function selectPlayableSources(identifier: string, files: ArchiveFile[], runtimeMinutes?: number | null): { sources: ArchiveVideoSource[]; durationSeconds: number | null } {
  const candidates = files.map((file) => {
    const name = file.name?.trim();
    if (!name || !name.toLowerCase().endsWith(".mp4")) return null;
    const lowerName = name.toLowerCase();
    if (lowerName.includes("trailer") || lowerName.includes("preview") || lowerName.includes("sample")) { return null }
    const format = (file.format ?? "").toLowerCase();
    if (format && (format.includes("audio") || format.includes("metadata") || format.includes("thumbnail"))) { return null }
    const sizeBytes = parsePositiveInt(file.size);
    if (sizeBytes !== null && sizeBytes <= 0) return null;
    const durationSeconds = parseDurationSeconds(file.length);
    if (runtimeMinutes && runtimeMinutes > 0) {
      const expectedSeconds = runtimeMinutes * 60;
      if (durationSeconds !== null) {
        if (durationSeconds < expectedSeconds * 0.55 || durationSeconds > expectedSeconds * 1.6) { return null }
      } else if (sizeBytes !== null && sizeBytes < MIN_UNTIMED_SIZE_BYTES) { return null }
    } else if (durationSeconds !== null && durationSeconds < MIN_UNDATED_DURATION_SECONDS) {
      return null;
    } else if (durationSeconds === null && sizeBytes !== null && sizeBytes < MIN_UNTIMED_SIZE_BYTES) {
      return null;
    }

    const width = parsePositiveInt(file.width);
    const height = parsePositiveInt(file.height);
    const { language, stem } = languageFromFileName(name);

    return {
      file, durationSeconds,
      priority: sourcePriority(file, height, sizeBytes),
      source: {
        url: encodeArchivePath(identifier, name),
        label: formatSourceLabel(file, height),
        width, height, sizeBytes, language, stem,
      } satisfies ArchiveVideoSource,
    };
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null).sort((a, b) => b.priority - a.priority);
  const seenUrls = new Set<string>();
  const sources: ArchiveVideoSource[] = [];
  let bestDuration: number | null = null;

  for (const item of candidates) {
    if (seenUrls.has(item.source.url)) continue;
    seenUrls.add(item.source.url);
    sources.push(item.source);
    if (bestDuration === null && item.durationSeconds !== null) {
      bestDuration = item.durationSeconds;
    }
  }

  return { sources, durationSeconds: bestDuration };
}

const MAX_SUBTITLE_BYTES = 3 * 1024 * 1024;

export function selectSubtitles(identifier: string, files: ArchiveFile[], itemLanguage: string, videoStems: string[]): ArchiveSubtitle[] {
  const stems = new Set(videoStems);
  const seen = new Set<string>();
  const subtitles: ArchiveSubtitle[] = [];
  for (const file of files) {
    const name = file.name?.trim();
    if (!name || !/\.(srt|vtt)$/i.test(name)) continue;
    const size = parsePositiveInt(file.size);
    if (size !== null && size > MAX_SUBTITLE_BYTES) continue;
    const detected = languageFromFileName(name);
    const language = detected.language || (detected.auto ? itemLanguage : "");
    const stem = stems.has(detected.stem) ? detected.stem : "";
    const key = `${stem}|${language}|${detected.auto}`;
    if (seen.has(key)) continue;
    seen.add(key);
    subtitles.push({
      id: `${subtitles.length}-${language || "und"}${detected.auto ? "-auto" : ""}`,
      url: `/api/subtitles?${new URLSearchParams({ item: identifier, file: name })}`,
      language, auto: detected.auto, stem,
    });
  }
  return subtitles.sort((a, b) => Number(a.auto) - Number(b.auto));
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) { throw new Error(`Internet Archive request failed with status ${res.status}`) }
  return (await res.json()) as T;
}

async function fetchArchiveMatchCached(title: string, releaseDate: string, runtimeMinutes: number | null): Promise<PublicDomainMovie | null> {
  "use cache";
  cacheLife("days");

  const searchPhrase = sanitizeSearchPhrase(title);
  if (!searchPhrase) return null;

  const targetYear = extractYear(releaseDate);
  const searchUrl = new URL(`${ARCHIVE_BASE}/advancedsearch.php`);
  searchUrl.searchParams.set("q", `collection:feature_films AND mediatype:movies AND title:"${searchPhrase}"`);
  searchUrl.searchParams.append("fl[]", "identifier");
  searchUrl.searchParams.append("fl[]", "title");
  searchUrl.searchParams.append("fl[]", "year");
  searchUrl.searchParams.append("sort[]", "downloads desc");
  searchUrl.searchParams.set("rows", "8");
  searchUrl.searchParams.set("output", "json");

  const searchData = await fetchJson<ArchiveSearchResponse>(searchUrl.toString());
  const docs = searchData.response?.docs ?? [];

  const matchedDocs = docs.filter((doc) => {
    if (!doc.identifier) return false;
    const docTitle = firstString(doc.title);
    if (!titlesMatch(docTitle, title)) return false;

    const docYear = extractYear(doc.year);
    if (targetYear !== null && docYear !== null && Math.abs(docYear - targetYear) > 2) { return false }
    return true;
  });

  // Fetch candidate metadata in parallel, but evaluate in ranked order so the first match
  // still wins, and a failed fetch only matters if every earlier candidate was rejected.
  const candidates = matchedDocs.slice(0, MAX_CANDIDATE_LOOKUPS);
  const metas = await Promise.allSettled(
    candidates.map((doc) => fetchJson<ArchiveMetadataResponse>(`${ARCHIVE_BASE}/metadata/${encodeURIComponent(doc.identifier!)}`)),
  );

  for (const [i, doc] of candidates.entries()) {
    const identifier = doc.identifier!;
    const settled = metas[i];
    if (settled.status === "rejected") throw settled.reason;
    const meta = settled.value;
    if (meta.is_dark) continue;
    const metaYear = extractYear(meta.metadata?.year ?? meta.metadata?.date ?? doc.year);
    if (targetYear !== null && (metaYear === null || Math.abs(metaYear - targetYear) > 2)) continue;
    const { sources, durationSeconds } = selectPlayableSources(identifier, meta.files ?? [], runtimeMinutes);
    if (sources.length === 0) continue;

    const resolvedTitle = firstString(meta.metadata?.title) || firstString(doc.title) || title;
    const audioLanguage = normalizeLanguage(meta.metadata?.language);
    return {
      identifier, title: resolvedTitle, year: metaYear ? String(metaYear) : null,
      archiveUrl: `${ARCHIVE_BASE}/details/${encodeURIComponent(identifier)}`,
      durationSeconds, sources, audioLanguage,
      subtitles: selectSubtitles(identifier, meta.files ?? [], audioLanguage, sources.map((s) => s.stem)),
    };
  }

  return null;
}

export async function findPublicDomainMovie(params: { title: string; releaseDate?: string; runtimeMinutes?: number | null }): Promise<PublicDomainMovie | null> {
  try {
    return await fetchArchiveMatchCached(params.title, params.releaseDate ?? "", params.runtimeMinutes ?? null);
  } catch (error) {
    console.warn("Internet Archive lookup failed", { title: params.title, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}
