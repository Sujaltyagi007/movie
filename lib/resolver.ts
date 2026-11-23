export type ResolverMediaType = "movie" | "tv";

export type RawResolvedSource = {
    raw: string;
    host: string;
};

export type TokenizedResolvedSource = RawResolvedSource & {
    url: string | null;
};

export type ApiDataHint = {
    id?: unknown;
    file_id?: unknown;
    hash?: unknown;
    file_name?: unknown;
    [key: string]: unknown;
};

export type VsDataHint = {
    wasm_url?: unknown;
    api_token?: unknown;
    token?: unknown;
    access_token?: unknown;
    [key: string]: unknown;
};

export type ResolvedDetails = {
    title: string | null;
    imdbId: string | null;
    fileName: string | null;
    backdrop: string | null;
    sources: RawResolvedSource[];
    _apiData: ApiDataHint;
    _apiTok: string;
    _vsData: VsDataHint;
};

type MintContextEntry = {
    expiresAt: number;
    apiData: ApiDataHint;
    apiTok: string;
    vsData: VsDataHint;
};

type OriginMetaEntry = {
    type: ResolverMediaType;
    tmdb: number;
    season: number;
    episode: number;
};

type MintedTokenEntry = {
    token: string;
    expiresAt: number;
};

type DecryptWasmExports = {
    memory: WebAssembly.Memory;
    alloc: (len: number) => number;
    decrypt: (ptr: number, len: number) => number;
};

type UpstreamApiResponse = {
    status_code?: unknown;
    data?: {
        id?: unknown;
        file_id?: unknown;
        hash?: unknown;
        title?: unknown;
        imdb_id?: unknown;
        file_name?: unknown;
        backdrop?: unknown;
        stream_urls?: unknown;
    };
    vs?: VsDataHint;
};

declare global {
    var __resolverMintContext: Map<string, MintContextEntry> | undefined;
    var __resolverOriginMeta: Map<string, OriginMetaEntry> | undefined;
    var __resolverMintedTokens: Map<string, MintedTokenEntry> | undefined;
    var __resolverWasmCache: Map<string, Promise<WebAssembly.Module>> | undefined;
    var __resolverInFlight: Map<string, Promise<ResolvedDetails>> | undefined;
}

const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const NEXUS = "https://stellarconductornexus.com";
const DEBUG = process.env.RESOLVER_DEBUG === "1";
const DEFAULT_API_TOK_TTL_MS = 45_000;
const DEFAULT_MINTED_TOK_TTL_MS = 3 * 60 * 60 * 1000;

const mintContextCache =
    globalThis.__resolverMintContext ??
    (globalThis.__resolverMintContext = new Map<string, MintContextEntry>());
const originMetaCache =
    globalThis.__resolverOriginMeta ??
    (globalThis.__resolverOriginMeta = new Map<string, OriginMetaEntry>());
const mintedTokenCache =
    globalThis.__resolverMintedTokens ??
    (globalThis.__resolverMintedTokens = new Map<string, MintedTokenEntry>());
const wasmCache =
    globalThis.__resolverWasmCache ??
    (globalThis.__resolverWasmCache = new Map<string, Promise<WebAssembly.Module>>());
const inFlightResolve =
    globalThis.__resolverInFlight ??
    (globalThis.__resolverInFlight = new Map<string, Promise<ResolvedDetails>>());

function getJwtExpiryMs(tok: string, fallbackMs: number): number {
    try {
        const parts = String(tok).split(".");
        const rawPayload = parts[1] ?? parts[0];
        const segment = parts.length === 3 ? parts[1] : rawPayload;
        const payload = JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as {
            exp?: unknown;
        };
        if (typeof payload?.exp === "number" && Number.isFinite(payload.exp)) {
            return payload.exp * 1000 - 15_000;
        }
    } catch {
        // ignore non-JWT token formats
    }
    return Date.now() + fallbackMs;
}

function parseResolverCtx(ctx: string): OriginMetaEntry | null {
    if (typeof ctx !== "string") return null;
    const m = /^(movie|tv):(\d+)(?::(\d+):(\d+))?$/.exec(ctx.trim());
    if (!m) return null;
    const type = m[1] === "tv" ? "tv" : "movie";
    const tmdb = Number(m[2]);
    if (type === "movie") return { type, tmdb, season: 1, episode: 1 };
    if (!m[3] || !m[4]) return null;
    return { type, tmdb, season: Number(m[3]), episode: Number(m[4]) };
}

const ex = (h: string, k: string): string | undefined => {
    const raw = new RegExp(`"${k}"\\s*:\\s*"([^"]+)"`).exec(h)?.[1];
    if (!raw) return undefined;
    try {
        const parsed: unknown = JSON.parse(`"${raw}"`);
        return typeof parsed === "string" ? parsed : raw;
    } catch {
        return raw;
    }
};

function browserHeaders(referer: string | null, dest = "iframe"): Record<string, string> {
    return {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...(referer ? { Referer: referer } : {}),
        "Sec-Fetch-Dest": dest,
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": referer ? "same-origin" : "none",
        "Upgrade-Insecure-Requests": "1",
    };
}

async function gate(type: ResolverMediaType, tmdb: number, season: number, episode: number): Promise<string> {
    const q = new URLSearchParams({ type, id: String(tmdb) });
    if (type === "tv") {
        q.set("season", String(season));
        q.set("episode", String(episode));
    }
    const gateUrl = `https://vsembed.ru/vs_src.php?${q}`;
    console.info("[resolver] gate:", gateUrl);
    const r = await fetch(gateUrl, { headers: { "User-Agent": UA, Referer: "https://vidsrc.to/", Accept: "application/json" } });
    const j = (await r.json().catch(() => null)) as { src?: unknown } | null;
    if (typeof j?.src !== "string" || !j.src) throw new Error("gate");
    return j.src;
}

async function playerConfig(type: ResolverMediaType, tmdb: number, season: number, episode: number): Promise<{ api: string; apiTok: string }> {
    for (let attempt = 0; attempt < 2; attempt++) {
        const src = await gate(type, tmdb, season, episode);
        const p1 = await (await fetch(src, { headers: browserHeaders("https://vsembed.ru/") })).text();
        const path = ex(p1, "playerUrl");
        if (!path) {
            if (DEBUG) { console.warn(`[resolver] attempt ${attempt + 1} no playerUrl: ${p1.length}B`, p1.slice(0, 200)) }
            continue;
        }
        const html = await (await fetch(NEXUS + path, { headers: browserHeaders(src) })).text();

        const rawApi = ex(html, "api");
        const streamBase = ex(html, "streamBase");
        const api = rawApi ?? (streamBase ? `${streamBase}&season=${season}&episode=${episode}&stream_urls` : undefined);
        const apiTok = ex(html, "apiToken");
        if (api && apiTok) return { api, apiTok };
        if (DEBUG) { console.warn(`[resolver] attempt ${attempt + 1} no config: ${html.length}B`, html.slice(0, 200)) }
    }
    throw new Error("expired config");
}

function isDecryptWasmExports(exports: WebAssembly.Exports): exports is WebAssembly.Exports & DecryptWasmExports {
    return (
        exports.memory instanceof WebAssembly.Memory &&
        typeof exports.alloc === "function" &&
        typeof exports.decrypt === "function"
    );
}

async function decrypt(b64: string, wasmUrl: string): Promise<string[]> {
    let modPromise = wasmCache.get(wasmUrl);
    if (!modPromise) {
        modPromise = fetch(wasmUrl).then((r) => r.arrayBuffer()).then((bytes) => WebAssembly.compile(bytes));
        wasmCache.set(wasmUrl, modPromise);
    }
    const mod = await modPromise.catch((err: unknown) => {
        wasmCache.delete(wasmUrl);
        throw err;
    });
    const instance = await WebAssembly.instantiate(mod, {});
    if (!isDecryptWasmExports(instance.exports)) { throw new Error("Invalid decrypt wasm exports"); }
    const w = instance.exports;
    const enc = Buffer.from(b64, "base64");
    const ptr = w.alloc(enc.length);
    new Uint8Array(w.memory.buffer, ptr, enc.length).set(enc);
    const len = w.decrypt(ptr, enc.length);
    return new TextDecoder().decode(new Uint8Array(w.memory.buffer, ptr + 12, len)).split("\n").filter(Boolean);
}

function cookieJar() {
    const jar = new Map<string, string>();
    return {
        absorb(res: Response) {
            const setCookie = res.headers.get("set-cookie");
            const list = res.headers.getSetCookie?.() ?? (setCookie ? [setCookie] : []);
            for (const c of list) {
                const [pair] = c.split(";");
                const i = pair.indexOf("=");
                if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
            }
        },
        header() { return [...jar].map(([k, v]) => `${k}=${v}`).join("; ") },
        get size() { return jar.size },
    };
}

const GENERIC_SEGMENTS = new Set([
    "master", "index", "playlist", "chunklist", "video", "stream", "hls",
    "embed", "play", "file", "manifest", "media", "watch", "v", "t", "p",
    "generate", "generate.php", "source", "sources", "cdn", "edge", "pl",
]);

function extractId(url: URL, apiData: ApiDataHint = {}): string {
    for (const k of ["id", "file_id", "fid", "hash", "v", "video_id", "vid", "stream", "token_id"]) {
        const v = url.searchParams.get(k);
        if (v && v.trim()) return v.trim();
    }
    for (const k of ["id", "file_id", "hash", "video_id", "vid"]) {
        const v = apiData?.[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }

    const segs = url.pathname.split("/").filter(Boolean).map((s) => s.replace(/\.[a-z0-9]+$/i, ""));
    for (let i = segs.length - 1; i >= 0; i--) {
        const s = segs[i];
        if (!s) continue;
        if (GENERIC_SEGMENTS.has(s.toLowerCase())) continue;
        if (s.length < 4) continue;
        if (!/[a-z0-9]/i.test(s)) continue;
        return s;
    }
    for (let i = segs.length - 1; i >= 0; i--) {
        if (segs[i]) return segs[i];
    }
    return "";
}

function parseTokenBody(body: string): string {
    const t = (body || "").trim();
    if (!t) return "";
    if (t.startsWith("{")) {
        try {
            const parsed = JSON.parse(t) as { token?: unknown };
            return typeof parsed.token === "string" ? parsed.token : "";
        } catch {
            return "";
        }
    }
    return t;
}

function nonEmptyString(value: unknown): string {
    return typeof value === "string" ? value : "";
}

export function invalidateMintedToken(rawUrl: string): void {
    try {
        mintedTokenCache.delete(new URL(rawUrl).origin);
    } catch { }
}

export async function mint(rawUrl: string, apiData: ApiDataHint = {}, apiTok = "", vsData: VsDataHint = {}, ctx = "", forceRefresh = false): Promise<string> {
    const start = new URL(rawUrl);
    if (!forceRefresh) {
        const cachedMint = mintedTokenCache.get(start.origin);
        if (cachedMint && cachedMint.expiresAt > Date.now()) { return cachedMint.token }
    } else {
        mintedTokenCache.delete(start.origin);
    }

    const cachedCtx = mintContextCache.get(start.origin);
    let activeCtx = cachedCtx && cachedCtx.expiresAt > Date.now() ? cachedCtx : null;

    const refreshMeta = parseResolverCtx(ctx) ?? originMetaCache.get(start.origin) ?? null;
    if (!apiTok && !activeCtx && refreshMeta) {
        await resolveDetails(refreshMeta.type, refreshMeta.tmdb, refreshMeta.season, refreshMeta.episode).catch(() => null);
        const refreshed = mintContextCache.get(start.origin);
        activeCtx = refreshed && refreshed.expiresAt > Date.now() ? refreshed : null;
    }

    let effectiveApiData: ApiDataHint = Object.keys(apiData ?? {}).length > 0 ? apiData : (activeCtx?.apiData ?? {});
    let effectiveApiTok = apiTok || activeCtx?.apiTok || "";
    let effectiveVsData: VsDataHint = Object.keys(vsData ?? {}).length > 0 ? vsData : (activeCtx?.vsData ?? {});
    const jar = cookieJar();
    let page: Response | null = null;
    let finalUrl = start;
    let referer = start.href;
    let origin = start.origin;
    let warmedUp = false;

    const runWarmup = async () => {
        if (warmedUp) return;
        warmedUp = true;
        try {
            const res = await fetch(rawUrl, {
                headers: { ...browserHeaders(null, "iframe"), "Sec-Fetch-Site": "none" },
                redirect: "follow",
                signal: AbortSignal.timeout(10_000),
            });
            page = res;
            jar.absorb(res);
            await res.arrayBuffer().catch(() => { });
            if (res.url && !/\/(cdn-cgi|__cf_chl)/.test(res.url)) {
                finalUrl = new URL(res.url);
                origin = finalUrl.origin;
                referer = finalUrl.href;
            }
        } catch (e: unknown) {
            if (DEBUG) { console.warn("[resolver] mint warmup fail", rawUrl, e instanceof Error ? e.message : String(e)) }
        }
    };

    const fastId = extractId(start, effectiveApiData);
    if (!effectiveApiTok || !fastId) {
        await runWarmup();
    }
    const id = extractId(finalUrl, effectiveApiData) || fastId;
    if (!id) {
        if (DEBUG) {
            console.warn("[resolver] mint no id", {
                start: start.href,
                final: finalUrl.href,
                pageStatus: (page as Response | null)?.status,
                cookies: jar.size,
            });
        }
        throw new Error("mint no id");
    }

    const buildCandidates = (): string[] => {
        const list = [
            ...new Set([
                effectiveApiTok,
                nonEmptyString(effectiveVsData?.api_token),
                nonEmptyString(effectiveVsData?.token),
                nonEmptyString(effectiveVsData?.access_token),
            ].filter(Boolean))
        ];
        return list.length ? list : [""];
    };

    if (DEBUG) {
        console.warn("[resolver] mint", {
            origin, id, referer, cookies: jar.size,
            pageStatus: (page as Response | null)?.status,
            startPath: start.pathname, finalPath: finalUrl.pathname,
            tokenCandidates: buildCandidates().map((t) => (t ? `${t.slice(0, 8)}…` : "(none)")),
        });
    }

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10000);

    const tryOnce = async (tok: string, targetId = id): Promise<string> => {
        const gen = new URL("/generate.php", origin);
        gen.searchParams.set("id", targetId);
        if (tok) gen.searchParams.set("api_token", tok);

        const baseHeaders: Record<string, string> = {
            "User-Agent": UA,
            Accept: "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: referer,
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "X-Requested-With": "XMLHttpRequest",
            ...(jar.size ? { Cookie: jar.header() } : {}),
        };

        let r = await fetch(gen, { headers: baseHeaders, signal: ctl.signal });
        let body = await r.text().catch(() => "");
        if (r.ok) {
            const out = parseTokenBody(body);
            if (out) return out;
        } else if (DEBUG) {
            console.warn("[resolver] mint GET", r.status, "tok=", tok ? "yes" : "no", "body=", body.slice(0, 120));
        }

        const form = new URLSearchParams();
        form.set("id", targetId);
        if (tok) form.set("api_token", tok);
        r = await fetch(gen, {
            method: "POST",
            body: form.toString(),
            headers: { ...baseHeaders, "Content-Type": "application/x-www-form-urlencoded" },
            signal: ctl.signal,
        });
        body = await r.text().catch(() => "");
        if (r.ok) {
            const out = parseTokenBody(body);
            if (out) return out;
        } else if (DEBUG) {
            console.warn("[resolver] mint POST", r.status, "tok=", tok ? "yes" : "no", "body=", body.slice(0, 120));
        }
        return "";
    };

    let currentId = id;
    const runCandidates = async (): Promise<string> => {
        for (const tok of buildCandidates()) {
            const out = await tryOnce(tok, currentId);
            if (out) return out;
        }
        return "";
    };

    const cacheMinted = (tok: string): string => {
        if (tok) {
            mintedTokenCache.set(origin, {
                token: tok,
                expiresAt: Math.max(Date.now() + 30_000, getJwtExpiryMs(tok, DEFAULT_MINTED_TOK_TTL_MS)),
            });
        }
        return tok;
    };

    try {
        const fastOut = await runCandidates();
        if (fastOut) return cacheMinted(fastOut);

        if (!warmedUp) {
            await runWarmup();
            currentId = extractId(finalUrl, effectiveApiData) || currentId;
            const warmedOut = await runCandidates();
            if (warmedOut) return cacheMinted(warmedOut);
        }
        if (!apiTok && refreshMeta) {
            const fresh = await resolveDetails(
                refreshMeta.type,
                refreshMeta.tmdb,
                refreshMeta.season,
                refreshMeta.episode,
            ).catch(() => null);
            if (fresh?._apiTok && fresh._apiTok !== effectiveApiTok) {
                effectiveApiData = fresh._apiData ?? effectiveApiData;
                effectiveApiTok = fresh._apiTok;
                effectiveVsData = fresh._vsData ?? effectiveVsData;
                const out = await tryOnce(effectiveApiTok, currentId);
                if (out) return cacheMinted(out);
            }
        }
        throw new Error("mint 403");
    } finally {
        clearTimeout(timer);
    }
}

function safeHost(u: unknown): string | null {
    if (typeof u !== "string") return null;
    try {
        return new URL(u).host;
    } catch {
        return null;
    }
}

export async function resolveDetails(
    type: ResolverMediaType,
    tmdb: number,
    season = 1,
    episode = 1,
): Promise<ResolvedDetails> {
    const key = `${type}:${tmdb}:${season}:${episode}`;
    const existing = inFlightResolve.get(key);
    if (existing) return existing;

    const promise = (async (): Promise<ResolvedDetails> => {
        const { api, apiTok } = await playerConfig(type, tmdb, season, episode);
        const j = (await (
            await fetch(`${api}&api_token=${encodeURIComponent(apiTok)}`, {
                headers: { "User-Agent": UA, Referer: NEXUS, Accept: "application/json" },
            })
        ).json()) as UpstreamApiResponse;

        if (DEBUG) console.warn("[resolver] api", j?.status_code, Object.keys(j?.data ?? {}));

        let urls: unknown = j?.data?.stream_urls;
        if (typeof urls === "string") {
            const wasmUrl = typeof j?.vs?.wasm_url === "string" ? j.vs.wasm_url : "";
            if (!wasmUrl) throw new Error("no wasm_url");
            urls = await decrypt(urls, wasmUrl);
        }
        if (!Array.isArray(urls) || !urls.length) throw new Error("no streams");

        const seen = new Set<string>();
        const sources: RawResolvedSource[] = [];
        for (const u of urls) {
            if (typeof u !== "string") continue;
            const h = safeHost(u);
            if (!h || seen.has(h)) continue;
            seen.add(h);
            sources.push({ raw: u, host: h });
        }
        if (!sources.length) throw new Error("no streams");

        const apiData: ApiDataHint = {
            id: j?.data?.id,
            file_id: j?.data?.file_id,
            hash: j?.data?.hash,
            file_name: j?.data?.file_name,
        };
        const vsData: VsDataHint = j?.vs ?? {};
        const expiresAt = Math.max(Date.now() + 5_000, getJwtExpiryMs(apiTok, DEFAULT_API_TOK_TTL_MS));
        for (const s of sources) {
            try {
                const origin = new URL(s.raw).origin;
                mintContextCache.set(origin, { expiresAt, apiData, apiTok, vsData });
                originMetaCache.set(origin, { type, tmdb: Number(tmdb), season, episode });
            } catch {
                // ignore invalid origin
            }
        }

        return {
            title: typeof j?.data?.title === "string" ? j.data.title : null,
            imdbId: typeof j?.data?.imdb_id === "string" ? j.data.imdb_id : null,
            fileName: typeof j?.data?.file_name === "string" ? j.data.file_name : null,
            backdrop: typeof j?.data?.backdrop === "string" ? j.data.backdrop : null,
            sources,
            _apiData: apiData,
            _apiTok: apiTok,
            _vsData: vsData,
        };
    })();

    inFlightResolve.set(key, promise);
    try {
        return await promise;
    } finally {
        if (inFlightResolve.get(key) === promise) {
            inFlightResolve.delete(key);
        }
    }
}

export async function resolveRaw(
    type: ResolverMediaType,
    tmdb: number,
    season = 1,
    episode = 1,
): Promise<RawResolvedSource[]> {
    const { sources } = await resolveDetails(type, tmdb, season, episode);
    return sources;
}

export async function resolve(
    type: ResolverMediaType,
    tmdb: number,
    season = 1,
    episode = 1,
): Promise<TokenizedResolvedSource[]> {
    const details = await resolveDetails(type, tmdb, season, episode);
    const apiData = details._apiData || {};
    const apiTok = details._apiTok || "";
    const vsData = details._vsData || {};

    return Promise.all(
        details.sources.map(async ({ raw, host }) => {
            const t = await mint(raw, apiData, apiTok, vsData).catch((e: unknown) => {
                if (DEBUG) console.warn("[resolver] mint fail", raw, "→", e instanceof Error ? e.message : String(e));
                return "";
            });
            if (!t) return { raw, host, url: null };
            const tokenized = new URL(raw);
            tokenized.searchParams.set("token", t);
            return { raw, host, url: tokenized.toString() };
        }),
    );
}
