
import { NextResponse } from "next/server";
import { STREAM_MOVIE } from "@/lib/stream";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!/^\d+$/.test(id)) { return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 }) }
        const response = await fetch(STREAM_MOVIE(Number(id)), { cache: "no-store" });
        if (!response.ok) { throw new Error(`Upstream error: ${response.status}`) }
        const html = await response.text();
        const match = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        if (!match) { throw new Error("Iframe not found in response") }
        const videoUrl = new URL(match[1]);
        if (videoUrl.hostname !== "vidsrc.sh") { throw new Error("Unexpected video provider"); }
        return NextResponse.json({ videoUrl: videoUrl.toString() });
    } catch (error) {
        console.error("Stream API error:", error);
        return NextResponse.json({ error: "Unable to load video" }, { status: 502 });
    }
}
