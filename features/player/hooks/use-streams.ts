"use client";
import { useEffect, useState } from "react";
import { isHlsSourceUrl, type AvailableStream } from "@/lib/stream-sources";

export type StreamLookupParams = {
    mediaType: "movie" | "tv";
    mediaId: number | null;
    season?: number;
    episode?: number;
    signal?: AbortSignal;
};

const inFlightStreams = new Map<string, Promise<AvailableStream[]>>();

export async function fetchAvailableStreams({ mediaType, mediaId, season, episode, signal }: StreamLookupParams): Promise<AvailableStream[]> {
    if (!mediaId) return [];

    const url = new URL(`/api/streams/${mediaType}/${mediaId}`, window.location.origin);
    if (mediaType === "tv" && season !== undefined) url.searchParams.set("season", String(season));
    if (mediaType === "tv" && episode !== undefined) url.searchParams.set("episode", String(episode));
    const key = url.pathname + url.search;

    let shared = inFlightStreams.get(key);
    if (!shared) {
        shared = (async () => {
            const res = await fetch(key);
            const data = (await res.json().catch(() => ({}))) as {
                sources?: AvailableStream[];
                servers?: AvailableStream[];
                error?: string;
            };
            if (!res.ok) throw new Error(data.error || "Failed to load streams");
            const list = Array.isArray(data.sources) ? data.sources : Array.isArray(data.servers) ? data.servers : [];
            return list.filter((s) => Boolean(s && typeof s.url === "string" && s.url.startsWith("/api/hls?u=") && isHlsSourceUrl(s.url)));
        })().finally(() => {
            if (inFlightStreams.get(key) === shared) {
                inFlightStreams.delete(key);
            }
        });
        inFlightStreams.set(key, shared);
    }

    if (!signal) return shared;
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    return new Promise<AvailableStream[]>((resolve, reject) => {
        const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
        signal.addEventListener("abort", onAbort, { once: true });
        shared.then(
            (res) => {
                signal.removeEventListener("abort", onAbort);
                resolve(res);
            },
            (err) => {
                signal.removeEventListener("abort", onAbort);
                reject(err);
            },
        );
    });
}

type StreamState = {
    key: string;
    servers: AvailableStream[];
    error: string;
};

export function useStreams(mediaType: "movie" | "tv", mediaId: number | null, options?: { season?: number; episode?: number; enabled?: boolean }) {
    const enabled = options?.enabled ?? true;
    const season = options?.season;
    const episode = options?.episode;
    const requestKey = enabled && mediaId ? `${mediaType}:${mediaId}:${season ?? ""}:${episode ?? ""}` : "";

    const [state, setState] = useState<StreamState>({ key: "", servers: [], error: "" });
    const [selectedId, setSelectedId] = useState<number | null>(null);

    useEffect(() => {
        if (!requestKey || !mediaId) return;
        const controller = new AbortController();
        fetchAvailableStreams({ mediaType, mediaId, season, episode, signal: controller.signal }).then((list) => {
            if (controller.signal.aborted) return;
            setState({ key: requestKey, servers: list, error: "" });
            setSelectedId((prev) => (list.some((s) => s.id === prev) ? prev : (list[0]?.id ?? null)));
        }).catch((err: unknown) => {
            if (controller.signal.aborted) return;
            setState({
                key: requestKey,
                servers: [],
                error: err instanceof Error ? err.message : "Failed to load streams",
            });
            setSelectedId(null);
        });

        return () => controller.abort();
    }, [requestKey, mediaType, mediaId, season, episode]);

    const loading = Boolean(requestKey) && state.key !== requestKey;
    const servers = state.key === requestKey ? state.servers : [];
    const error = state.key === requestKey ? state.error : "";
    const activeServer = servers.find((s) => s.id === selectedId) ?? servers[0] ?? null;

    return { servers, activeServer, selectedId, setSelectedId, loading, error };
}
