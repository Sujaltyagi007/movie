export type RawStreamSource = {
    host: string;
    url: string;
    label?: string;
    language?: string;
    fileName?: string;
};

export type RankedStreamSource = RawStreamSource & {
    height: number;
    audioScore: number;
};

export type AvailableStream = {
    id: number;
    server: string;
    host: string;
    height: number;
    audioScore: number;
    position: number;
    url: string;
    type: "application/vnd.apple.mpegurl";
    label?: string;
    language?: string;
};

export type DeadStreamSource = {
    server: string;
    reason: string;
};

export type AudioRendition = {
    lang: string;
    name: string;
    group: string;
    isDefault: boolean;
    uri: string;
};

export function isHttpUrl(candidate: unknown): candidate is string {
    if (typeof candidate !== "string") return false;
    const trimmed = candidate.trim();
    if (!trimmed) return false;
    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

export function isHlsSourceUrl(url: string | undefined): boolean {
    if (!url) return false;
    try {
        const parsed = new URL(url, "https://placeholder.invalid");
        if (parsed.pathname === "/api/hls") return true;
        return /\.m3u8$/i.test(parsed.pathname);
    } catch {
        return /\.m3u8(?:$|\?)/i.test(url) || /^\/api\/hls(?:$|\?)/.test(url);
    }
}

export function stripTokenParam(rawUrl: string): string {
    try {
        const parsed = new URL(rawUrl);
        parsed.searchParams.delete("token");
        return parsed.toString();
    } catch {
        return rawUrl;
    }
}

export function toProxiedHlsUrl(rawUrl: string, ctx?: string): string {
    const base = `/api/hls?u=${encodeURIComponent(stripTokenParam(rawUrl))}`;
    return ctx ? `${base}&ctx=${encodeURIComponent(ctx)}` : base;
}

export function audioScore(fileName: string | null | undefined): number {
    const value = fileName ?? "";
    if (/\b(MULTi|DUAL|Dublado)\b/i.test(value)) return 2;
    if (/\b(ITA|FRE|VF|GER|SPA|LAT|RUS|POL|TUR)\b/i.test(value)) return 1;
    return 0;
}

export function rankStreamSources(list: RawStreamSource[], fallbackFileName?: string | null): RankedStreamSource[] {
    const seen = new Set<string>();
    return list
        .filter((s) => isHttpUrl(s.url) && typeof s.host === "string" && s.host.trim().length > 0)
        .map((s) => ({
            ...s,
            host: s.host.trim(),
            url: s.url.trim(),
            height: Number(/(\d{3,4})p/.exec(s.url)?.[1] ?? 0),
            audioScore: audioScore(s.fileName ?? fallbackFileName ?? s.label),
        }))
        .filter((s) => {
            if (seen.has(s.host)) return false;
            seen.add(s.host);
            return true;
        })
        .sort((a, b) => (b.audioScore - a.audioScore) || (b.height - a.height));
}

export async function probeHlsSource(
    url: string,
    headers?: Record<string, string>,
): Promise<{ ok: true; body: string } | { ok: false; reason: string }> {
    if (!isHttpUrl(url)) return { ok: false, reason: "Invalid URL" };
    try {
        const res = await fetch(url, {
            headers,
            signal: AbortSignal.timeout(6000),
        });
        if (res.status !== 200) {
            return { ok: false, reason: `HTTP ${res.status}` };
        }
        const text = await res.text();
        if (!text.trimStart().startsWith("#EXTM3U")) {
            return { ok: false, reason: "Response is not an #EXTM3U playlist" };
        }
        return { ok: true, body: text };
    } catch (error) {
        return {
            ok: false,
            reason: error instanceof Error ? error.message : "Probe request failed",
        };
    }
}

export async function isHlsAlive(url: string, headers?: Record<string, string>): Promise<boolean> {
    const result = await probeHlsSource(url, headers);
    return result.ok;
}

export function parseAudioRenditions(
    master: string,
    masterUrl: string,
    wrapUrl: (rawUrl: string) => string = toProxiedHlsUrl,
): AudioRendition[] {
    const renditions: AudioRendition[] = [];
    let base: URL;
    try {
        base = new URL(masterUrl);
    } catch {
        return renditions;
    }

    for (const rawLine of master.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line.startsWith("#EXT-X-MEDIA:")) continue;

        const attrs = new Map<string, string>();
        const attrText = line.slice("#EXT-X-MEDIA:".length);
        const attrPattern = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/g;
        let match: RegExpExecArray | null;
        while ((match = attrPattern.exec(attrText)) !== null) {
            const key = match[1].toUpperCase();
            const val = match[2].startsWith('"') && match[2].endsWith('"')
                ? match[2].slice(1, -1)
                : match[2];
            attrs.set(key, val);
        }

        if ((attrs.get("TYPE") ?? "").toUpperCase() !== "AUDIO") continue;

        const rawUri = attrs.get("URI") ?? "";
        let uri = "";
        if (rawUri) {
            try {
                const resolved = new URL(rawUri, base);
                if (resolved.protocol === "https:" || resolved.protocol === "http:") {
                    resolved.searchParams.delete("token");
                    uri = wrapUrl(resolved.toString());
                }
            } catch {
                uri = "";
            }
        }

        renditions.push({
            lang: attrs.get("LANGUAGE") ?? "",
            name: attrs.get("NAME") ?? "",
            group: attrs.get("GROUP-ID") ?? "",
            isDefault: (attrs.get("DEFAULT") ?? "").toUpperCase() === "YES",
            uri,
        });
    }

    return renditions;
}
