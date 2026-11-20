'use client';
import { Fragment, useState } from "react";
import { useHeroPlayer } from "@/components/hero-player";
import { AlertCircle, LoaderCircle, Play, RotateCcw, X } from "lucide-react";

type VideoPlayButtonProps = {
  trailerKey?: string;
  title?: string;
  label?: string;
  mediaId?: number;
  mediaType?: "movie" | "tv";
  [prop: string]: unknown;
};

async function fetchStreamUrl(mediaId?: number, mediaType?: "movie" | "tv"): Promise<string> {
  if (!mediaId || !mediaType) throw new Error("Invalid movie or TV show ID.");
  const response = await fetch(`/api/stream/${mediaId}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Failed to load video.");
  if (!data.videoUrl) throw new Error("Video URL not found.");
  return data.videoUrl as string;
}

export function VideoPlayButton({ title, label, mediaId, mediaType }: VideoPlayButtonProps) {
  const hero = useHeroPlayer();
  const [isOpen, setIsOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePlayVideo = async () => {
    if (hero) {
      hero.play({ label: "Now playing", load: () => fetchStreamUrl(mediaId, mediaType) });
      return;
    }

    setIsOpen(true);
    setLoading(true);
    setError("");
    setVideoUrl(null);
    try {
      setVideoUrl(await fetchStreamUrl(mediaId, mediaType));
    } catch (err) {
      console.error("Video playback error:", err);
      setError(err instanceof Error ? err.message : "Unable to load video.");
    } finally {
      setLoading(false);
    }
  };

  const closePlayer = () => {
    setIsOpen(false);
    setVideoUrl(null);
    setError("");
  };

  return (
    <Fragment>
      <button type="button" onClick={() => void handlePlayVideo()} className="group inline-flex items-center gap-2.5 rounded-full bg-white py-2 pl-2 pr-5 text-sm font-medium text-night shadow-lg ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0">
        <span className="grid size-7 place-items-center rounded-full bg-night text-white transition group-hover:scale-110">
          <Play className="ml-0.5 size-3.5 fill-current" />
        </span>
        {label ?? "Play video"}
      </button>
      {isOpen && (
        <div role="dialog" aria-modal="true" aria-label={title ?? "Video player"} className="fixed inset-0 z-50 grid place-items-center bg-night/85 p-4 backdrop-blur-md">
          <div className="relative w-[min(1100px,100%,calc((100dvh-7rem)*16/9))]">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="min-w-0 truncate text-base font-medium text-white sm:text-lg">{title ?? label ?? "Video"}</h2>
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
              {videoUrl && !loading && !error && (
                <iframe src={videoUrl} title={title ?? "Video player"} className="absolute inset-0 size-full border-0" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="origin" />
              )}
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
