import { VALID_IMDB_ID } from "@/lib/vidsrc-subtitles";
import { NextResponse, type NextRequest } from "next/server";
import { getSubtitlesForLangs } from "@/lib/subtitles-lookup";

function parseOptionalPositiveInt(raw: string | null): number | undefined | null {
  if (raw === null || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const imdbId = id.trim();
  if (!VALID_IMDB_ID.test(imdbId)) { return NextResponse.json({ error: "Invalid IMDb ID" }, { status: 400 }) }
  const sp = request.nextUrl.searchParams;
  const season = parseOptionalPositiveInt(sp.get("season"));
  const episode = parseOptionalPositiveInt(sp.get("episode"));
  if (season === null || episode === null || (season === undefined) !== (episode === undefined)) { return NextResponse.json({ error: "Invalid season or episode" }, { status: 400 }) }
  const rawLangs = sp.get("langs")?.trim();
  const langs = rawLangs ? rawLangs.split(",").map((l) => l.trim()).filter(Boolean) : ["eng"];
  try {
    const tracks = await getSubtitlesForLangs({ imdbId, langs, season, episode });
    return NextResponse.json({ id: imdbId, langs, tracks });
  } catch (error) {
    console.error("[sub] lookup failed:", error);
    return NextResponse.json({ error: "Unable to load subtitles" }, { status: 502 });
  }
}
