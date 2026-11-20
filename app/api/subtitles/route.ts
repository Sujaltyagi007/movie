import type { NextRequest } from "next/server";
import { srtToVtt } from "@/lib/subtitles";

const MAX_BYTES = 3 * 1024 * 1024;
const ITEM_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

/**
 * Serves an Internet Archive subtitle file as WebVTT from our own origin:
 * browsers only play WebVTT in <track>, and same-origin avoids CORS issues on <track>.
 * GET /api/subtitles?item=his_girl_friday&file=his_girl_friday.asr.srt
 * Locked down to .srt/.vtt files on archive.org, with a size cap — not a general proxy.
 */
export async function GET(request: NextRequest) {
  const item = request.nextUrl.searchParams.get("item") ?? "";
  const file = request.nextUrl.searchParams.get("file") ?? "";
  if (!ITEM_ID.test(item) || !/\.(srt|vtt)$/i.test(file) || file.length > 200 || file.split("/").some((part) => part === ".." || part === "")) {
    return new Response("Bad subtitle request", { status: 400 });
  }

  const url = `https://archive.org/download/${encodeURIComponent(item)}/${file.split("/").map(encodeURIComponent).join("/")}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: "follow" });
    if (!res.ok) return new Response("Subtitle not found", { status: res.status === 404 ? 404 : 502 });
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) return new Response("Subtitle too large", { status: 413 });
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) return new Response("Subtitle too large", { status: 413 });

    const vtt = srtToVtt(decodeText(bytes));
    return new Response(vtt, {
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        // Subtitle files on Archive.org essentially never change.
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("Subtitle proxy error:", error);
    return new Response("Couldn't load subtitles", { status: 502 });
  }
}

/** UTF-8 when valid, otherwise Windows-1252 (common for older .srt files with accents). */
function decodeText(bytes: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}
