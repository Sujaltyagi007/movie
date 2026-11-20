import type { NextRequest } from "next/server";
import { clampPage, getFeedPage, parseFeedQuery } from "@/lib/feed";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const feed = parseFeedQuery(params);
  if (!feed) return Response.json({ error: "Unknown list" }, { status: 400 });

  try {
    const page = await getFeedPage(feed, clampPage(params.get("page")));
    return Response.json(page, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("Titles API error:", error);
    return Response.json({ error: "Couldn't load more titles" }, { status: 502 });
  }
}
