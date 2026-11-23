import { NextResponse } from "next/server";
import { getAudioRenditionsForTitle } from "@/lib/streams-resolver";

const VALID_TYPE = /^(movie|tv)$/;
const VALID_ID = /^\d+$/;

function parseOptionalPositiveInt(raw: string | null): number | undefined | null {
  if (raw === null || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!VALID_TYPE.test(type) || !VALID_ID.test(id)) { return NextResponse.json({ error: "Invalid media parameters" }, { status: 400 }) }
  const { searchParams } = new URL(request.url);
  const season = parseOptionalPositiveInt(searchParams.get("season"));
  const episode = parseOptionalPositiveInt(searchParams.get("episode"));
  if (season === null || episode === null) { return NextResponse.json({ error: "Invalid season or episode" }, { status: 400 }) }
  const tracks = await getAudioRenditionsForTitle(
    type as "movie" | "tv", id,
    type === "tv" ? season : undefined,
    type === "tv" ? episode : undefined,
  );
  return NextResponse.json({ tracks });
}
