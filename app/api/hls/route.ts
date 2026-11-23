import { isIP } from "node:net";
import { sealHlsTarget, unsealHlsTarget } from "@/lib/hls-token";
import { invalidateMintedToken, mint } from "@/lib/resolver";
import { lookup } from "node:dns/promises";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const NEXUS_REFERER = "https://stellarconductornexus.com/";
const UPSTREAM_TIMEOUT_MS = 15_000;
const DNS_CACHE_TTL_MS = 60_000;
const safeHostCache = new Map<string, number>();

function isPrivateIp(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized.startsWith("::ffff:")) { return isPrivateIp(normalized.slice(7)) }
  if (isIP(normalized) === 4) {
    const parts = normalized.split(".").map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    return false;
  }
  if (isIP(normalized) === 6) {
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) { return true }
    return false;
  }
  return true;
}

async function assertSafeHttpsTarget(raw: string): Promise<URL> {
  const parsed = new URL(raw);
  if (parsed.protocol !== "https:") { throw new Error("Only https targets are allowed") }
  if (parsed.username || parsed.password) { throw new Error("Credentials in target URL are not allowed") }
  const host = parsed.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) { throw new Error("Localhost targets are not allowed") }
  const unbracketed = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  if (isIP(unbracketed)) {
    if (isPrivateIp(unbracketed)) throw new Error("Private IP targets are not allowed");
    return parsed;
  }

  const cachedUntil = safeHostCache.get(unbracketed);
  if (cachedUntil && cachedUntil > Date.now()) {
    return parsed;
  }

  const records = await lookup(unbracketed, { all: true });
  if (records.length === 0 || records.some((r) => isPrivateIp(r.address))) { throw new Error("Resolved target IP is not allowed") }
  safeHostCache.set(unbracketed, Date.now() + DNS_CACHE_TTL_MS);
  return parsed;
}

function toProxiedHlsUrl(candidate: string, base: URL, ctx?: string): string | null {
  try {
    const resolved = new URL(candidate, base);
    if (resolved.protocol !== "https:") return null;
    resolved.searchParams.delete("token");
    return sealHlsTarget(resolved.toString(), ctx);
  } catch {
    return null;
  }
}

function rewritePlaylist(body: string, baseUrl: URL, ctx?: string): string {
  return body.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith("#")) {
      return line.replace(/URI="([^"]+)"/g, (full, rawUri: string) => {
        const proxied = toProxiedHlsUrl(rawUri, baseUrl, ctx);
        return proxied ? `URI="${proxied}"` : full;
      });
    }
    return toProxiedHlsUrl(trimmed, baseUrl, ctx) ?? line;
  }).join("\n");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawToken = searchParams.get("u")?.trim();
  if (!rawToken) { return new Response("Missing u parameter", { status: 400 }) }

  const unsealed = unsealHlsTarget(rawToken);
  if (!unsealed) { return new Response("Invalid stream token", { status: 400 }) }

  const ctx = unsealed.ctx && /^(movie:\d+|tv:\d+:\d+:\d+)$/.test(unsealed.ctx) ? unsealed.ctx : undefined;
  let target: URL;
  try { target = await assertSafeHttpsTarget(unsealed.url) }
  catch (error) { return new Response(error instanceof Error ? error.message : "Invalid target URL", { status: 400 }) }
  target.searchParams.delete("token");

  const fetchUpstreamWithMint = async (forceRefresh: boolean) => {
    const token = await mint(target.toString(), {}, "", {}, ctx ?? "", forceRefresh).catch(() => "");
    const upstreamUrl = new URL(target.toString());
    if (token) { upstreamUrl.searchParams.set("token", token); }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const res = await fetch(upstreamUrl.toString(), {
        headers: { "User-Agent": UA, Referer: NEXUS_REFERER },
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  try {
    let upstream = await fetchUpstreamWithMint(false);
    if (upstream.status === 401 || upstream.status === 403) {
      await upstream.body?.cancel().catch(() => undefined);
      invalidateMintedToken(target.toString());
      upstream = await fetchUpstreamWithMint(true);
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok) {
      const bytes = new Uint8Array(await upstream.arrayBuffer());
      return new Response(bytes, {
        status: upstream.status,
        headers: { ...(contentType ? { "Content-Type": contentType } : {}), "Cache-Control": "no-store" },
      });
    }

    const hintPlaylist = /\.m3u8$/i.test(target.pathname) || /mpegurl/i.test(contentType);
    if (hintPlaylist || !upstream.body) {
      const bytes = new Uint8Array(await upstream.arrayBuffer());
      const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 32));
      if (hintPlaylist || /^\uFEFF?\s*#EXTM3U/.test(head)) {
        const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        return new Response(rewritePlaylist(text, target, ctx), {
          status: upstream.status,
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Cache-Control": "public, max-age=60",
          },
        });
      }
      return new Response(bytes, {
        status: upstream.status,
        headers: {
          "Content-Type": contentType || "application/octet-stream",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Peek only the first chunk so #EXTM3U playlists served as text/plain get rewritten,
    // while binary segments stream straight through without full-body buffering.
    const reader = upstream.body.getReader();
    const first = await reader.read();
    if (first.done) {
      return new Response(new Uint8Array(0), {
        status: upstream.status,
        headers: {
          "Content-Type": contentType || "application/octet-stream",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const head = new TextDecoder("utf-8", { fatal: false }).decode(first.value.subarray(0, 32));
    if (/^\uFEFF?\s*#EXTM3U/.test(head)) {
      const chunks: Uint8Array[] = [first.value];
      let total = first.value.byteLength;
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        chunks.push(next.value);
        total += next.value.byteLength;
      }
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.byteLength;
      }
      const text = new TextDecoder("utf-8", { fatal: false }).decode(merged);
      return new Response(rewritePlaylist(text, target, ctx), {
        status: upstream.status,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    let firstSent = false;
    const stream = new ReadableStream<Uint8Array>({
      async pull(streamController) {
        if (!firstSent) {
          firstSent = true;
          streamController.enqueue(first.value);
          return;
        }
        const next = await reader.read();
        if (next.done) {
          streamController.close();
        } else {
          streamController.enqueue(next.value);
        }
      },
      cancel() {
        return reader.cancel();
      },
    });

    return new Response(stream, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[hls] upstream error:", error);
    return new Response("Upstream fetch failed", { status: 502 });
  }
}
