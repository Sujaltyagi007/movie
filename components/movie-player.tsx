"use client";
import type { ArchiveVideoSource } from "@/lib/archive";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertCircle, ExternalLink, LoaderCircle, Maximize, Minimize, Pause, PictureInPicture2, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";

type MoviePlayerProps = {
  title: string;
  sources: ArchiveVideoSource[];
  poster?: string | null;
  archiveUrl: string;
  durationHintSeconds?: number | null;
};

type WebkitVideoElement = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;
const SKIP_SECONDS = 10;
const CONTROLS_HIDE_MS = 2600;
const noopSubscribe = () => () => { };

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function MoviePlayer({ title, sources, poster, archiveUrl, durationHintSeconds }: MoviePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sourceIndex, setSourceIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationHintSeconds ?? 0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [failed, setFailed] = useState(false);

  const pipSupported = useSyncExternalStore(noopSubscribe, () => Boolean(document.pictureInPictureEnabled), () => false);
  const activeSource = sources[sourceIndex] ?? sources[0];

  const scheduleHideControls = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setControlsVisible(true);
    hideTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, CONTROLS_HIDE_MS);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => { setFullscreen(document.fullscreenElement === containerRef.current) };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || failed) return;
    if (video.paused) {
      try {
        await video.play();
        setHasStarted(true);
        scheduleHideControls();
      } catch {
        setPlaying(false);
      }
    } else {
      video.pause();
      setControlsVisible(true);
    }
  }, [failed, scheduleHideControls]);

  const seekBy = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      const max = video.duration || duration || Infinity;
      const next = Math.min(Math.max(0, video.currentTime + delta), max);
      video.currentTime = next;
      setCurrentTime(next);
      scheduleHideControls();
    },
    [duration, scheduleHideControls],
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
    if (!nextMuted && video.volume === 0) {
      video.volume = 0.7;
      setVolume(0.7);
    }
    scheduleHideControls();
  }, [scheduleHideControls]);

  const handleVolumeChange = (nextVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.min(1, Math.max(0, nextVolume));
    video.volume = clamped;
    video.muted = clamped === 0;
    setVolume(clamped);
    setMuted(clamped === 0);
    scheduleHideControls();
  };

  const switchQuality = (nextIndex: number) => {
    const video = videoRef.current;
    if (!video || nextIndex === sourceIndex) return;
    const resumeAt = video.currentTime;
    const wasPlaying = !video.paused;
    setFailed(false);
    setBuffering(true);
    setSourceIndex(nextIndex);

    requestAnimationFrame(() => {
      const el = videoRef.current;
      if (!el) return;
      el.load();
      el.addEventListener(
        "loadedmetadata",
        () => {
          if (resumeAt > 0 && Number.isFinite(el.duration)) {
            el.currentTime = Math.min(resumeAt, el.duration);
          }
          el.playbackRate = playbackRate;
          if (wasPlaying) el.play().catch(() => undefined);
        },
        { once: true },
      );
    });
  };

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    const video = videoRef.current as WebkitVideoElement | null;
    if (!container) return;
    try {
      if (document.fullscreenElement === container) await document.exitFullscreen();
      else if (container.requestFullscreen) await container.requestFullscreen();
      else video?.webkitEnterFullscreen?.();
    } catch {
      video?.webkitEnterFullscreen?.();
    }
    scheduleHideControls();
  }, [scheduleHideControls]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "SELECT" || tag === "INPUT" || tag === "A") return;
    const key = e.key.toLowerCase();
    if (key === " " || key === "k") {
      e.preventDefault();
      void togglePlay();
    } else if (key === "arrowleft" || key === "j") {
      e.preventDefault();
      seekBy(-SKIP_SECONDS);
    } else if (key === "arrowright" || key === "l") {
      e.preventDefault();
      seekBy(SKIP_SECONDS);
    } else if (key === "arrowup") {
      e.preventDefault();
      handleVolumeChange(volume + 0.1);
    } else if (key === "arrowdown") {
      e.preventDefault();
      handleVolumeChange(volume - 0.1);
    } else if (key === "m") {
      e.preventDefault();
      toggleMute();
    } else if (key === "f") {
      e.preventDefault();
      void toggleFullscreen();
    }
  };

  const showControls = controlsVisible || !playing || failed;
  const maxDuration = duration > 0 ? duration : 1;
  const progressPct = Math.min(100, (currentTime / maxDuration) * 100);
  const bufferedPct = Math.min(100, (bufferedEnd / maxDuration) * 100);

  return (
    <div ref={containerRef} tabIndex={0} role="region" aria-label={`${title} movie player`} onKeyDown={handleKeyDown} onMouseMove={scheduleHideControls} onTouchStart={scheduleHideControls} onMouseLeave={() => { if (playing) setControlsVisible(false) }}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-night text-white shadow-card ring-1 ring-white/15 outline-none focus-visible:ring-2 focus-visible:ring-accent sm:rounded-[28px]"
    >
      <video ref={videoRef} src={activeSource?.url} poster={poster ?? undefined} playsInline preload="metadata" onClick={() => void togglePlay()}
        onPlay={() => {
          setPlaying(true);
          setHasStarted(true);
          setBuffering(false);
          scheduleHideControls();
        }}
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
        }}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onLoadedMetadata={(e) => {
          if (Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) {
            setDuration(e.currentTarget.duration);
          }
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onProgress={(e) => {
          const { buffered } = e.currentTarget;
          if (buffered.length > 0) setBufferedEnd(buffered.end(buffered.length - 1));
        }}
        onEnded={() => {
          setPlaying(false);
          setControlsVisible(true);
        }}
        onError={() => {
          setBuffering(false);
          setPlaying(false);
          if (sourceIndex + 1 < sources.length) setSourceIndex((prev) => prev + 1);
          else setFailed(true);
        }}
        className="size-full bg-black object-contain" />

      <div className={`pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 bg-linear-to-b from-black/80 via-black/40 to-transparent px-3 py-3 transition-opacity duration-300 sm:px-5 sm:py-4 ${showControls ? "opacity-100" : "opacity-0"}`}>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-white/95 sm:text-sm">{title}</p>
          <p className="text-[11px] text-white/65">Public Domain · Internet Archive</p>
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          {sources.length > 1 && (
            <select value={sourceIndex} onChange={(e) => switchQuality(Number(e.target.value))} aria-label="Video quality" className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
              {sources.map((src, i) => (
                <option key={src.url} value={i} className="bg-night text-white">{src.label}</option>
              ))}
            </select>
          )}
          <a href={archiveUrl} target="_blank" rel="noreferrer" className="hidden items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur transition hover:bg-white/25 sm:inline-flex">
            Source <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-night/90 p-6 text-center">
          <AlertCircle className="size-9 text-amber-400" strokeWidth={1.75} />
          <p className="mt-3 text-sm font-medium sm:text-base">Stream couldn&apos;t load right now</p>
          <p className="mt-1 max-w-sm text-xs text-white/70 sm:text-sm">
            Internet Archive may be throttling or the file format isn&apos;t supported on this browser.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <button type="button" onClick={() => {
              setFailed(false);
              setBuffering(true);
              setSourceIndex(0);
              requestAnimationFrame(() => {
                videoRef.current?.load();
                videoRef.current?.play().catch(() => setBuffering(false));
              });
            }}
              className="rounded-full bg-white px-4 py-2 text-xs font-medium text-night transition hover:bg-white/90 sm:text-sm"
            >
              Try again
            </button>
            <a
              href={archiveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/25 sm:text-sm"
            >
              Watch on Archive.org <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      ) : buffering ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-black/55 backdrop-blur">
            <LoaderCircle className="size-7 animate-spin text-white" />
          </span>
        </div>
      ) : !playing ? (
        <button
          type="button"
          onClick={() => void togglePlay()}
          aria-label={hasStarted ? "Resume playback" : `Play ${title}`}
          className="absolute inset-0 m-auto grid size-14 place-items-center rounded-full bg-white/95 text-night shadow-2xl transition hover:scale-105 hover:bg-white sm:size-16"
        >
          <Play className="ml-0.5 size-6 fill-current sm:size-7" />
        </button>
      ) : null}

      {!failed && (
        <div
          className={`absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/55 to-transparent px-3 pb-2.5 pt-8 transition-opacity duration-300 sm:px-5 sm:pb-3.5 ${showControls ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
        >
          <div className="relative mb-2 flex h-5 items-center">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full bg-white/35 transition-[width] duration-150" style={{ width: `${bufferedPct}%` }} />
            </div>
            <div className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-accent" style={{ width: `${progressPct}%` }} />
            <input
              type="range"
              min={0}
              max={maxDuration}
              step={1}
              value={Math.min(currentTime, maxDuration)}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (videoRef.current) videoRef.current.currentTime = next;
                setCurrentTime(next);
                scheduleHideControls();
              }}
              aria-label="Seek"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <button type="button" onClick={() => void togglePlay()} aria-label={playing ? "Pause" : "Play"} className="grid size-9 place-items-center rounded-full text-white transition hover:bg-white/15"  >
                {playing ? <Pause className="size-4.5 fill-current" /> : <Play className="size-4.5 fill-current" />}
              </button>
              <button type="button" onClick={() => seekBy(-SKIP_SECONDS)} aria-label={`Skip back ${SKIP_SECONDS} seconds`} className="grid size-9 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white">
                <RotateCcw className="size-4" />
              </button>
              <button type="button" onClick={() => seekBy(SKIP_SECONDS)} aria-label={`Skip forward ${SKIP_SECONDS} seconds`} className="grid size-9 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white" >
                <RotateCw className="size-4" />
              </button>
              <div className="flex items-center gap-1">
                <button type="button" onClick={toggleMute} aria-label={muted || volume === 0 ? "Unmute" : "Mute"} className="grid size-9 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white"  >
                  {muted || volume === 0 ? <VolumeX className="size-4.5" /> : <Volume2 className="size-4.5" />}
                </button>
                <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(e) => handleVolumeChange(Number(e.target.value))} aria-label="Volume" className="hidden h-1 w-20 cursor-pointer accent-white sm:block" />
              </div>
              <span className="ml-1 text-xs tabular-nums text-white/85 sm:text-[13px]">
                {formatTime(currentTime)}
                <span className="text-white/50"> / {formatTime(duration)}</span>
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              <button type="button" onClick={() => {
                const idx = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number]);
                const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
                if (videoRef.current) videoRef.current.playbackRate = next;
                setPlaybackRate(next);
                scheduleHideControls();
              }} aria-label={`Playback speed ${playbackRate}x`} className="rounded-full px-2.5 py-1 text-xs font-medium text-white/90 transition hover:bg-white/15 hover:text-white"  >
                {playbackRate}x
              </button>
              {pipSupported && (
                <button type="button" onClick={async () => {
                  try {
                    if (document.pictureInPictureElement) await document.exitPictureInPicture();
                    else await videoRef.current?.requestPictureInPicture();
                  } catch { }
                }} aria-label="Picture in picture" className="hidden size-9 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white sm:grid"  >
                  <PictureInPicture2 className="size-4" />
                </button>
              )}
              <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} className="grid size-9 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white" >
                {fullscreen ? <Minimize className="size-4.5" /> : <Maximize className="size-4.5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
