"use client";
import { Fragment, useState } from "react";
import type { ArchiveVideoSource } from "@/lib/archive";
import type { AvailableStream } from "@/lib/stream-sources";
import type { MoviePlayerProps } from "@/features/player/components/movie-player";
import { fetchAvailableStreams, useStreams } from "@/features/player/hooks/use-streams";
import { AlertCircle, LoaderCircle, Play, RotateCcw, X } from "lucide-react";
import { useHeroPlayer, type ResolvedPlayTarget } from "@/features/player/components/hero-player";
import { LazyMoviePlayer, preloadMoviePlayer } from "@/features/player/components/movie-player-lazy";

type VideoPlayButtonProps = {
  trailerKey?: string;
  title?: string;
  label?: string;
  mediaId?: number;
  imdbId?: string | null;
  mediaType?: "movie" | "tv";
  season?: number;
  episode?: number;
  subUrl?: string;
  subLang?: string;
  [prop: string]: unknown;
};

type StreamRequest = {
  mediaId?: number;
  imdbId?: string | null;
  mediaType?: "movie" | "tv";
  season?: number;
  episode?: number;
  subUrl?: string;
  subLang?: string;
};

function toPlayerProps(title: string, servers: AvailableStream[]): MoviePlayerProps {
  const sources: ArchiveVideoSource[] = servers.map((s) => ({
    url: s.url,
    label: s.label ?? `${s.host}${s.height ? ` · ${s.height}p` : ""}`,
    width: null,
    height: s.height || null,
    sizeBytes: null,
    language: s.language ?? "",
    stem: "",
  }));

  return {
    title,
    sources,
    sourceBadge: "Hosted Stream · HLS",
    autoPlay: true,
  };
}

async function fetchStreamUrl({ mediaId, imdbId, mediaType, season, episode, subUrl, subLang }: StreamRequest): Promise<string> {
  const streamId = mediaType === "tv" && imdbId ? imdbId : mediaId;
  if (!streamId || !mediaType) throw new Error("Invalid movie or TV show ID.");

  const response = await fetch(`/api/stream/${streamId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mediaType,
      ...(imdbId ? { imdbId } : {}),
      ...(mediaType === "tv" ? { season: season ?? 1, episode: episode ?? 1 } : {}),
      ...(subUrl?.trim() ? { sub: subUrl.trim() } : {}),
      ...(subLang?.trim() ? { subLang: subLang.trim() } : {}),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Failed to load video.");
  if (!data.videoUrl) throw new Error("Video URL not found.");
  return data.videoUrl as string;
}

export function VideoPlayButton({ title, label, mediaId, imdbId, mediaType, season, episode, subUrl, subLang }: VideoPlayButtonProps) {
  const hero = useHeroPlayer();
  const resolvedType = mediaType ?? "movie";
  const { servers, loading: streamsLoading } = useStreams(resolvedType, mediaId ?? null, {
    season: mediaType === "tv" ? (season ?? 1) : undefined,
    episode: mediaType === "tv" ? (episode ?? 1) : undefined,
    enabled: Boolean(mediaId && mediaType),
  });

  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState<Exclude<ResolvedPlayTarget, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const displayTitle = title ?? label ?? "Video";
  const request: StreamRequest = { mediaId, imdbId, mediaType, season, episode, subUrl, subLang };

  const resolvePlayTarget = async (): Promise<Exclude<ResolvedPlayTarget, string>> => {
    if (servers.length > 0) {
      return { kind: "player", player: toPlayerProps(displayTitle, servers) };
    }
    if (streamsLoading && mediaId && mediaType) {
      try {
        const fetched = await fetchAvailableStreams({
          mediaType, mediaId, season: mediaType === "tv" ? (season ?? 1) : undefined,
          episode: mediaType === "tv" ? (episode ?? 1) : undefined
        });
        if (fetched.length > 0) {
          return { kind: "player", player: toPlayerProps(displayTitle, fetched) };
        }
      } catch { }
    }
    const src = await fetchStreamUrl(request);
    return { kind: "iframe", src };
  };

  const handlePlayVideo = async () => {
    if (hero) {
      if (servers.length > 0) {
        hero.play({ label: "Now playing", player: toPlayerProps(displayTitle, servers) });
        return;
      }
      hero.play({ label: "Now playing", load: resolvePlayTarget });
      return;
    }

    setIsOpen(true);
    setLoading(true);
    setError("");
    setTarget(null);
    try {
      setTarget(await resolvePlayTarget());
    } catch (err) {
      console.error("Video playback error:", err);
      setError(err instanceof Error ? err.message : "Unable to load video.");
    } finally {
      setLoading(false);
    }
  };

  const closePlayer = () => {
    setIsOpen(false);
    setTarget(null);
    setError("");
  };

  return (
    <Fragment>
      <button type="button" onClick={() => void handlePlayVideo()} onPointerEnter={preloadMoviePlayer} onFocus={preloadMoviePlayer} onTouchStart={preloadMoviePlayer} className="group inline-flex items-center gap-2.5 rounded-full bg-white py-2 pl-2 pr-5 text-sm font-medium text-night shadow-lg ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0">
        <span className="grid size-7 place-items-center rounded-full bg-night text-white transition group-hover:scale-110">
          <Play className="ml-0.5 size-3.5 fill-current" />
        </span>
        {label ?? "Play video"}
      </button>
      {isOpen && (
        <div role="dialog" aria-modal="true" aria-label={title ?? "Video player"} className="fixed inset-0 z-50 grid place-items-center bg-night/85 p-4 backdrop-blur-md">
          <div className="relative w-[min(1100px,100%,calc((100dvh-7rem)*16/9))]">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="min-w-0 truncate text-base font-medium text-white sm:text-lg">{displayTitle}</h2>
              <button type="button" aria-label="Close player" onClick={closePlayer} className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/25">
                <X className="size-5" />
              </button>
            </div>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
              {loading && (
                <div className="absolute inset-0 grid place-items-center text-white/80">
                  <LoaderCircle className="size-9 animate-spin" />
                </div>
              )}
              {error && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center">
                  <div className="flex max-w-xs flex-col items-center gap-3">
                    <AlertCircle className="size-8 text-white/80" />
                    <p className="text-sm text-white/80">{error}</p>
                    <button type="button" onClick={() => void handlePlayVideo()} className="mt-1 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-night transition hover:bg-white/90">
                      <RotateCcw className="size-4" /> Try again
                    </button>
                  </div>
                </div>
              )}
              {target && !loading && !error && (
                target.kind === "player" ? (
                  <LazyMoviePlayer {...target.player} />
                ) : (
                  <iframe src={target.src} title={title ?? "Video player"} className="absolute inset-0 size-full border-0" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="origin" />
                )
              )}
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
