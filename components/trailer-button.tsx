"use client";
import { flushSync } from "react-dom";
import { Play, X } from "lucide-react";
import { useHeroPlayer } from "@/components/hero-player";
import { Fragment, useEffect, useRef, useState } from "react";

const VARIANTS = {
  primary: "bg-white text-night shadow-lg hover:bg-white/90",
  glass: "bg-white/15 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25",
} as const;

type LockableOrientation = ScreenOrientation & { lock?: (orientation: string) => Promise<void> };

const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches;

const embedUrl = (key: string) => `https://www.youtube-nocookie.com/embed/${key}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

export function TrailerButton({ videoKey, title, variant = "primary", className = "" }: {
  videoKey: string;
  title: string;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const wentFullscreen = useRef(false);
  const hero = useHeroPlayer();

  function openPlayer() {
    if (hero) {
      hero.play({ src: embedUrl(videoKey), label: "Trailer" });
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog) return;
    flushSync(() => setOpen(true));
    dialog.showModal();
    if (isTouchDevice() && dialog.requestFullscreen) {
      dialog.requestFullscreen({ navigationUI: "hide" }).then(() => {
        wentFullscreen.current = true;
        return (screen.orientation as LockableOrientation | undefined)?.lock?.("landscape");
      }).catch(() => { });
    }
  }

  function closePlayer() {
    setOpen(false);
    if (dialogRef.current?.open) dialogRef.current.close();
    if (wentFullscreen.current) {
      wentFullscreen.current = false;
      screen.orientation?.unlock?.();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    }
  }

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && wentFullscreen.current) {
        wentFullscreen.current = false;
        screen.orientation?.unlock?.();
        setOpen(false);
        if (dialogRef.current?.open) dialogRef.current.close();
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  return (
    <Fragment>
      <button type="button" onClick={openPlayer} className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition ${VARIANTS[variant]} ${className}`}      >
        <Play className="size-4 fill-current" /> Watch trailer
      </button>

      <dialog ref={dialogRef} aria-label={`${title} trailer`} onClose={() => (open ? closePlayer() : undefined)} onClick={(e) => { if (e.target === e.currentTarget) closePlayer(); }}
        className={[
          "overflow-visible bg-transparent p-0 text-white backdrop:bg-night/85 backdrop:backdrop-blur-sm",
          "m-auto w-[min(1100px,94vw,calc((100dvh-9rem)*16/9))]",
          "touch:m-0 touch:h-dvh touch:max-h-none touch:w-dvw touch:max-w-none touch:overflow-hidden touch:bg-black touch:backdrop:bg-black",
        ].join(" ")}
      >
        {open && (
          <div className="animate-rise touch:relative touch:grid touch:size-full touch:animate-none touch:place-items-center">
            <div className={["mb-3 flex items-center justify-between gap-4",
              "touch:absolute touch:inset-x-0 touch:top-0 touch:z-10 touch:mb-0 touch:bg-linear-to-b touch:from-black/80 touch:to-transparent",
              "touch:pb-8 touch:pl-[max(1rem,env(safe-area-inset-left))] touch:pr-[max(1rem,env(safe-area-inset-right))] touch:pt-[max(0.75rem,env(safe-area-inset-top))]",
              "touch:landscape:pointer-events-none touch:landscape:justify-end touch:landscape:bg-none",
            ].join(" ")} >
              <p className="min-w-0 truncate text-sm font-medium text-white/85 touch:landscape:hidden">
                <span className="text-white/50">Trailer · </span>
                {title}
              </p>
              <button type="button" onClick={closePlayer} aria-label="Close trailer" autoFocus className="pointer-events-auto grid size-10 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur transition hover:bg-white/30 touch:size-11" >
                <X className="size-5" />
              </button>
            </div>

            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10 touch:w-[min(100vw,calc(100dvh*16/9))] touch:rounded-none touch:shadow-none touch:ring-0">
              <iframe src={embedUrl(videoKey)} title={`${title} trailer`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="size-full" />
            </div>
          </div>
        )}
      </dialog>
    </Fragment>
  );
}
