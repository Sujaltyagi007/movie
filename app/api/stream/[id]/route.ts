import { NextResponse } from "next/server";
import { STREAM_EPISODE, STREAM_MOVIE } from "@/lib/stream";
import {
  buildVidsrcSubtitlesManifestUrl,
  getExternalSubtitles,
  resolvePublicOrigin,
  VALID_IMDB_ID,
} from "@/lib/vidsrc-subtitles";

const VALID_ID = /^(\d+|tt\d+)$/;

type StreamPayload = {
  mediaType?: unknown;
  imdbId?: unknown;
  season?: unknown;
  episode?: unknown;
  sub?: unknown;
  subLang?: unknown;
};

function parsePositiveInt(value: unknown, fallback: number): number | null {
  if (value === undefined || value === null) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function resolveStreamUrl(embedUrl: string): Promise<string> {
  const response = await fetch(embedUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Upstream error: ${response.status}`);
  const html = await response.text();
  const match = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (!match) throw new Error("Iframe not found in response");
  const videoUrl = new URL(match[1]);
  if (videoUrl.hostname !== "vidsrc.sh") throw new Error("Unexpected video provider");
  return videoUrl.toString();
}

async function resolveAutoSubInfo(
  request: Request,
  imdbId: string | null,
  season?: number,
  episode?: number,
  lang?: string,
): Promise<string | undefined> {
  if (!imdbId) return undefined;
  const origin = resolvePublicOrigin(request);
  if (!origin) return undefined;
  const tracks = await getExternalSubtitles({ imdbId, season, episode });
  if (tracks.length === 0) return undefined;
  return buildVidsrcSubtitlesManifestUrl(origin, { imdbId, season, episode, lang });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!VALID_ID.test(id)) return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
    const autoSub = await resolveAutoSubInfo(request, VALID_IMDB_ID.test(id) ? id : null);
    return NextResponse.json({ videoUrl: await resolveStreamUrl(STREAM_MOVIE(id, autoSub)) });
  } catch (error) {
    console.error("Stream API error:", error);
    return NextResponse.json({ error: "Unable to load video" }, { status: 502 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!VALID_ID.test(id)) return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });

    const body = (await request.json().catch(() => null)) as StreamPayload | null;
    const mediaType =
      body?.mediaType === "tv"
        ? "tv"
        : body?.mediaType === undefined || body.mediaType === "movie"
          ? "movie"
          : null;
    if (!mediaType) return NextResponse.json({ error: "Invalid media type" }, { status: 400 });

    const rawImdb = typeof body?.imdbId === "string" ? body.imdbId.trim() : "";
    const resolvedImdbId = VALID_IMDB_ID.test(id) ? id : VALID_IMDB_ID.test(rawImdb) ? rawImdb : null;
    const manualSub = typeof body?.sub === "string" && body.sub.trim() ? body.sub.trim() : undefined;
    const subLang = typeof body?.subLang === "string" && /^[a-z]{2}(?:-[a-z]{2})?$/i.test(body.subLang.trim()) ? body.subLang.trim() : undefined;

    let embedUrl: string;
    if (mediaType === "tv") {
      const season = parsePositiveInt(body?.season, 1);
      const episode = parsePositiveInt(body?.episode, 1);
      if (!season || !episode) {
        return NextResponse.json({ error: "Invalid season or episode" }, { status: 400 });
      }
      const subInfo = manualSub ?? (await resolveAutoSubInfo(request, resolvedImdbId, season, episode, subLang));
      try {
        embedUrl = STREAM_EPISODE(id, season, episode, subInfo);
      } catch {
        return NextResponse.json({ error: "Invalid subtitle URL" }, { status: 400 });
      }
    } else {
      const subInfo = manualSub ?? (await resolveAutoSubInfo(request, resolvedImdbId, undefined, undefined, subLang));
      try {
        embedUrl = STREAM_MOVIE(id, subInfo);
      } catch {
        return NextResponse.json({ error: "Invalid subtitle URL" }, { status: 400 });
      }
    }

    return NextResponse.json({ videoUrl: await resolveStreamUrl(embedUrl) });
  } catch (error) {
    console.error("Stream API error:", error);
    return NextResponse.json({ error: "Unable to load video" }, { status: 502 });
  }
}
