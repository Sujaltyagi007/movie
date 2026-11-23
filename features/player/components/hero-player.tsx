"use client";
import { flushSync } from "react-dom";
import type { MoviePlayerProps } from "@/features/player/components/movie-player";
import { LazyMoviePlayer, preloadMoviePlayer } from "@/features/player/components/movie-player-lazy";
import { VideoLanguageSelect, type VideoVersion } from "@/features/player/components/video-language-select";
import { AlertCircle, LoaderCircle, Maximize, Minimize, RotateCcw, Smartphone, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type ResolvedPlayTarget = | string | { kind: "iframe"; src: string } | { kind: "player"; player: MoviePlayerProps };

export type PlayRequest = {
  label: string;
  src?: string;
  player?: MoviePlayerProps;
  load?: () => Promise<ResolvedPlayTarget>;
  versions?: VideoVersion[];
  versionId?: string;
  onVersionChange?: (version: VideoVersion) => void;
};
type HeroPlayer = { play: (request: PlayRequest) => void };

type PlayerState = {
  label: string;
  load?: () => Promise<ResolvedPlayTarget>;
  status: "loading" | "ready" | "error";
  src: string | null;
  player: MoviePlayerProps | null;
  error?: string;
  versions?: VideoVersion[];
  versionId?: string;
  onVersionChange?: (version: VideoVersion) => void;
};

const HeroPlayerContext = createContext<HeroPlayer | null>(null);

export function useHeroPlayer() {
  return useContext(HeroPlayerContext);
}

type LockableOrientation = ScreenOrientation & { lock?: (orientation: string) => Promise<void> };

const isTouch = () => window.matchMedia("(pointer: coarse)").matches;
const hasFullscreenApi = () => document.fullscreenEnabled === true;

export function HeroStage({ title, children }: { title: string; children: ReactNode }) {
  const [playing, setPlaying] = useState<PlayerState | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cover, setCover] = useState(false);
  const boxRef = useRef<HTMLElement>(null);

  const start = useCallback(async (request: PlayRequest) => {
    if (request.player) {
      setPlaying({ label: request.label, status: "ready", src: null, player: request.player });
      return;
    }
    if (request.src || !request.load) {
      setPlaying({
        label: request.label,
        status: request.src ? "ready" : "error",
        src: request.src ?? null, player: null,
        error: request.src ? undefined : "No video to play.",
        versions: request.versions, versionId: request.versionId,
        onVersionChange: request.onVersionChange,
      });
      return;
    }
    const load = request.load;
    setPlaying({ label: request.label, load, status: "loading", src: null, player: null });
    const stillCurrent = (state: PlayerState | null) => state !== null && state.load === load;
    try {
      const resolved = await load();
      if (typeof resolved === "string") {        setPlaying((state) => (stillCurrent(state) ? { ...state!, status: "ready", src: resolved, player: null } : state));
      }
       else if (resolved.kind === "iframe") {
        setPlaying((state) => (stillCurrent(state) ? { ...state!, status: "ready", src: resolved.src, player: null } : state));
      } else {
        setPlaying((state) => (stillCurrent(state) ? { ...state!, status: "ready", src: null, player: resolved.player } : state));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load video.";
      setPlaying((state) => (stillCurrent(state) ? { ...state!, status: "error", error: message } : state));
    }
  }, []);

  const enterFullscreen = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    if (!hasFullscreenApi() || !box.requestFullscreen) {
      setCover(true);
      return;
    }
    box.requestFullscreen({ navigationUI: "hide" }).then(() => {
      if (isTouch()) return (screen.orientation as LockableOrientation | undefined)?.lock?.("landscape");
    }).catch(() => setCover(true));
  }, []);

  const play = useCallback(
    (request: PlayRequest) => {
      // Start fetching the player chunk while the stream resolves (no-op once cached).
      preloadMoviePlayer();
      flushSync(() => void start(request));
      const box = boxRef.current;
      if (!box) return;
      if (isTouch()) { enterFullscreen() }
      else { box.scrollIntoView({ behavior: "smooth", block: "nearest" }) }
    },
    [start, enterFullscreen],
  );

  const stop = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    setCover(false);
    setPlaying(null);
  }, []);

  useEffect(() => {
    const onChange = () => {
      const active = boxRef.current !== null && document.fullscreenElement === boxRef.current;
      setIsFullscreen(active);
      if (!active) screen.orientation?.unlock?.();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.fullscreenElement) return;
      if (cover) setCover(false);
      else stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, cover, stop]);

  function switchVersion(version: VideoVersion) {
    setPlaying((state) => (state ? { ...state, src: version.src, versionId: version.id, status: "ready" } : state));
    playing?.onVersionChange?.(version);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
      return;
    }
    if (cover) {
      setCover(false);
      return;
    }
    enterFullscreen();
  }

  const expanded = isFullscreen || cover;
  const icon = "grid size-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25 touch:size-11";
  const boxClass = expanded ? `size-full pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)] ${cover ? "fixed inset-0 z-50" : "relative"}` : "relative animate-rise mx-auto mt-4 aspect-video w-full max-w-[calc((100dvh-6rem)*16/9)] rounded-2xl shadow-card sm:rounded-[28px]";
  const readyPlayer = playing?.status === "ready" ? playing.player : null;

  return (
    <HeroPlayerContext value={{ play }}>
      {playing ? (
        <section ref={boxRef} data-player-open={cover ? "" : undefined} aria-label={`${playing.label}: ${title}`} aria-busy={playing.status === "loading"} className={`grid place-items-center overflow-hidden bg-black text-white ${boxClass}`}        >
          {readyPlayer ? (
            <div className={expanded ? "aspect-video h-auto max-h-full w-[min(100%,calc((100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))*16/9))]" : "absolute inset-0 size-full"} >
              <LazyMoviePlayer {...readyPlayer} autoPlay onClose={stop} />
            </div>
          ) : playing.status === "ready" && playing.src ? (
            <iframe src={playing.src} title={`${playing.label}: ${title}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="origin" className={expanded ? "aspect-video h-auto max-h-full w-[min(100%,calc((100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))*16/9))] border-0" : "absolute inset-0 size-full border-0"} />
          ) : playing.status === "loading" ? (
            <div className="flex flex-col items-center gap-3 text-white/80">
              <LoaderCircle className="size-10 animate-spin text-white" strokeWidth={1.5} />
              <p className="text-sm">Loading {title}…</p>
            </div>
          ) : (
            <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-white/10 ring-1 ring-white/15">
                <AlertCircle className="size-6 text-white/80" strokeWidth={1.75} />
              </span>
              <p className="font-medium">Can&apos;t play this right now</p>
              <p className="text-sm text-white/65">{playing.error}</p>
              <div className="mt-1 flex gap-2">
                {playing.load && (
                  <button type="button" onClick={() => void start({ label: playing.label, load: playing.load })} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-night transition hover:bg-white/90 touch:py-3"  >
                    <RotateCcw className="size-4" /> Try again
                  </button>
                )}
                <button type="button" onClick={stop} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-medium ring-1 ring-white/20 transition hover:bg-white/20 touch:py-3"   >
                  Back to details
                </button>
              </div>
            </div>
          )}

          {expanded && playing.status === "ready" && (
            <p className="pointer-events-none absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] hidden items-center justify-center gap-2 text-xs text-white/55 touch:portrait:flex">
              <Smartphone className="size-4 rotate-90" strokeWidth={1.75} /> Turn your phone sideways for a bigger picture
            </p>
          )}

          {playing.status === "ready" && !readyPlayer && playing.versions && playing.versions.length > 1 && (
            <VideoLanguageSelect versions={playing.versions} value={playing.versionId ?? playing.versions[0].id} onChange={switchVersion} className="absolute left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))] z-10" />
          )}

          {!readyPlayer && (
            <div className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex gap-2">
              {playing.status === "ready" && (
                <button type="button" onClick={toggleFullscreen} aria-label={expanded ? "Exit full screen" : "Full screen"} title={expanded ? "Exit full screen" : "Full screen"} className={icon}>
                  {expanded ? <Minimize className="size-4.5" /> : <Maximize className="size-4.5" />}
                </button>
              )}
              <button type="button" onClick={stop} aria-label="Close video" title="Close video" className={icon}>
                <X className="size-5" />
              </button>
            </div>
          )}
        </section>
      ) : (
        children
      )}
    </HeroPlayerContext>
  );
}
