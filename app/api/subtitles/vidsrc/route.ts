import { NextResponse, type NextRequest } from "next/server";
import {
  buildVidsrcSubtitleEntries,
  getExternalSubtitles,
  prioritizeSubtitleLanguage,
  resolvePublicOrigin,
  VALID_IMDB_ID,
} from "@/lib/vidsrc-subtitles";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function parseOptionalPositiveInt(raw: unknown): number | undefined | null {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Returns VidSrc-compatible subtitle JSON: `[{ "file": "https://.../api/subtitles/track?...", "label": "..." }]`.
 * GET /api/subtitles/vidsrc?id=tt0944947&season=1&episode=5&lang=hi
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const imdbId = params.get("id")?.trim() ?? "";
  const season = parseOptionalPositiveInt(params.get("season"));
  const episode = parseOptionalPositiveInt(params.get("episode"));
  const lang = params.get("lang")?.trim() ?? "";

  if (!VALID_IMDB_ID.test(imdbId) || season === null || episode === null || (season === undefined) !== (episode === undefined)) {
    return NextResponse.json({ error: "Invalid subtitle manifest parameters" }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const tracks = prioritizeSubtitleLanguage(await getExternalSubtitles({ imdbId, season, episode }), lang);
    const origin = resolvePublicOrigin(request) ?? request.nextUrl.origin;
    const entries = buildVidsrcSubtitleEntries(origin, { imdbId, season, episode }, tracks);

    return NextResponse.json(entries, {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("VidSrc subtitle manifest error:", error);
    return NextResponse.json({ error: "Unable to load subtitle manifest" }, { status: 502, headers: CORS_HEADERS });
  }
}

/**
 * Lists available subtitle languages (`{ tracks: [{ langCode, label }] }`) for UI dropdowns
 * without putting episode parameters into the browser URL.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { imdbId?: unknown; season?: unknown; episode?: unknown } | null;
  const imdbId = typeof body?.imdbId === "string" ? body.imdbId.trim() : "";
  const season = parseOptionalPositiveInt(body?.season);
  const episode = parseOptionalPositiveInt(body?.episode);

  if (!VALID_IMDB_ID.test(imdbId) || season === null || episode === null || (season === undefined) !== (episode === undefined)) {
    return NextResponse.json({ error: "Invalid subtitle lookup parameters" }, { status: 400 });
  }

  const tracks = await getExternalSubtitles({ imdbId, season, episode });
  return NextResponse.json({
    tracks: tracks.map(({ langCode, label }) => ({ langCode, label })),
  });
}
