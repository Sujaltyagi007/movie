import { AlertCircle, ExternalLink, LoaderCircle, Play } from "lucide-react";

export function MoviePlayerStatus({
  failed,
  buffering,
  playing,
  hasStarted,
  title,
  archiveUrl,
  onPlay,
  onRetry,
}: {
  failed: boolean;
  buffering: boolean;
  playing: boolean;
  hasStarted: boolean;
  title: string;
  archiveUrl?: string;
  onPlay: () => void;
  onRetry: () => void;
}) {
  if (failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-night/90 p-6 text-center">
        <AlertCircle className="size-9 text-amber-400" strokeWidth={1.75} />
        <p className="mt-3 text-sm font-medium sm:text-base">Stream couldn&apos;t load right now</p>
        <p className="mt-1 max-w-sm text-xs text-white/70 sm:text-sm">
          {archiveUrl
            ? "Internet Archive may be throttling or the file format isn't supported on this browser."
            : "The stream may be unavailable or the format isn't supported on this browser."}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          <button type="button" onClick={onRetry} className="rounded-full bg-white px-4 py-2 text-xs font-medium text-night transition hover:bg-white/90 sm:text-sm">
            Try again
          </button>
          {archiveUrl && (
            <a href={archiveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/25 sm:text-sm">
              Watch on Archive.org <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }

  if (buffering) {
    return (
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <span className="grid size-14 place-items-center rounded-full bg-black/55 backdrop-blur">
          <LoaderCircle className="size-7 animate-spin text-white" />
        </span>
      </div>
    );
  }

  if (!playing) {
    return (
      <button
        type="button"
        onClick={onPlay}
        aria-label={hasStarted ? "Resume playback" : `Play ${title}`}
        className="absolute inset-0 m-auto grid size-14 place-items-center rounded-full bg-white/95 text-night shadow-2xl transition hover:scale-105 hover:bg-white sm:size-16"
      >
        <Play className="ml-0.5 size-6 fill-current sm:size-7" />
      </button>
    );
  }

  return null;
}
