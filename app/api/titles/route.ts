import type { NextRequest } from "next/server";
import { clampPage, getFeedPage, parseFeedQuery } from "@/lib/feed";

/**
 * Next page of a browse list or search, for infinite scroll.
 * GET /api/titles?type=movie&list=top_rated&page=3   ·   GET /api/titles?q=batman&page=2
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const feed = parseFeedQuery(params);
  if (!feed) return Response.json({ error: "Unknown list" }, { status: 400 });

  try {
    const page = await getFeedPage(feed, clampPage(params.get("page")));
    return Response.json(page, {
      // TMDB lists change slowly; let the browser/CDN reuse a page for a few minutes.
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("Titles API error:", error);
    return Response.json({ error: "Couldn't load more titles" }, { status: 502 });
  }
}
