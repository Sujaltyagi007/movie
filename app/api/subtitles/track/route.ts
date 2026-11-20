import { NextResponse, type NextRequest } from "next/server";
import { srtToVtt } from "@/lib/subtitles";
import { getExternalSubtitles, VALID_IMDB_ID } from "@/lib/vidsrc-subtitles";

const MAX_BYTES = 3 * 1024 * 1024;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function parseOptionalPositiveInt(raw: string | null): number | undefined | null {
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Serves a verified external subtitle track normalized as WebVTT (.vtt) with CORS enabled
 * so VidSrc's cross-origin player can fetch and switch between multiple subtitle languages.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const imdbId = params.get("id")?.trim() ?? "";
  const trackId = params.get("track")?.trim() ?? "";
  const season = parseOptionalPositiveInt(params.get("season"));
  const episode = parseOptionalPositiveInt(params.get("episode"));

  if (
    !VALID_IMDB_ID.test(imdbId) ||
    !trackId ||
    trackId.length > 120 ||
    season === null ||
    episode === null ||
    (season === undefined) !== (episode === undefined)
  ) {
    return new NextResponse("Invalid subtitle track request", { status: 400, headers: CORS_HEADERS });
  }

  try {
    const tracks = await getExternalSubtitles({ imdbId, season, episode });
    const matched = tracks.find((t) => t.id === trackId);
    if (!matched) {
      return new NextResponse("Subtitle track not found", { status: 404, headers: CORS_HEADERS });
    }

    const res = await fetch(matched.url, { signal: AbortSignal.timeout(10_000), redirect: "follow" });
    if (!res.ok) {
      return new NextResponse("Subtitle file unavailable", {
        status: res.status === 404 ? 404 : 502,
        headers: CORS_HEADERS,
      });
    }

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) {
      return new NextResponse("Subtitle file too large", { status: 413, headers: CORS_HEADERS });
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) {
      return new NextResponse("Subtitle file too large", { status: 413, headers: CORS_HEADERS });
    }

    const text = decodeText(bytes).trim();
    if (!text || /^\s*(?:<!doctype|<html)/i.test(text)) {
      return new NextResponse("Unsupported subtitle format", { status: 415, headers: CORS_HEADERS });
    }

    const vtt = srtToVtt(text);
    return new NextResponse(vtt, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("VidSrc subtitle track error:", error);
    return new NextResponse("Couldn't load subtitle track", { status: 502, headers: CORS_HEADERS });
  }
}
