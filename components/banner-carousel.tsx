"use client";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Flame, Info, Play, Star, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";

export type BannerSlide = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  overview: string;
  backdrop: string;
  thumb: string;
  logo: { src: string; width: number; height: number } | null;
  year: string;
  rating: number;
  runtime: number | null;
  genres: string[];
  trailerKey: string | null;
};

const SLIDE_MS = 7000;

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function formatRuntime(minutes: number | null) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  return h ? `${h}h ${minutes % 60}m` : `${minutes}m`;
}

export function BannerCarousel({ slides }: { slides: BannerSlide[] }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [trailer, setTrailer] = useState<BannerSlide | null>(null);
  const touchStartX = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false,);
  const pageHidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);
  const count = slides.length;
  const autoplay = count > 1 && !reducedMotion;
  const paused = hovered || focused || trailer !== null || pageHidden;
  const slide = slides[index];
  const upNext = Array.from({ length: Math.min(3, count - 1) }, (_, i) => (index + 1 + i) % count);
  const [mounted, setMounted] = useState(() => new Set([0, 1 % count]));

  const goTo = (i: number) => {
    const target = ((i % count) + count) % count;
    setIndex(target);
    setMounted((prev) => (prev.has(target) && prev.has((target + 1) % count) ? prev : new Set(prev).add(target).add((target + 1) % count)));
  };
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (trailer && !dialog.open) dialog.showModal();
    if (!trailer && dialog.open) dialog.close();
  }, [trailer]);

  const runtime = formatRuntime(slide.runtime);
  const meta = [slide.year, runtime].filter(Boolean);

  return (
    <section aria-roledescription="carousel" aria-label="Trending movies" tabIndex={0} onKeyDown={(e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
      }} className="relative h-140 overflow-hidden rounded-[28px] bg-night text-white shadow-panel outline-accent focus-visible:outline-2 focus-visible:outline-offset-4 sm:h-150 lg:h-[min(680px,78vh)]">
      {slides.map((s, i) =>
        mounted.has(i) ? (
          <div key={s.id} aria-hidden className={`absolute inset-0 transition-[opacity,transform] ease-out ${i === index ? "scale-100 opacity-100 duration-[1000ms,7000ms]" : "scale-105 opacity-0 duration-1000"}`}>
            <Image src={s.backdrop} alt="" fill priority={i === 0} quality={90} sizes="(min-width: 1440px) 1200px, (min-width: 1024px) calc(100vw - 240px), calc(100vw - 48px)" className="object-cover object-[center_25%]" />
          </div>
        ) : null,
      )}
      <div className="absolute inset-0 bg-linear-to-r from-night/90 via-night/35 via-45% to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-night/90 via-night/30 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-night/40 to-transparent lg:hidden" />
      <div className="relative z-10 flex h-full flex-col justify-end p-5 pb-6 sm:p-10 lg:px-12 lg:py-6 ">
        <div key={slide.id} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${count}`} className="animate-rise max-w-120">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-medium ring-1 ring-white/20 backdrop-blur">
            <Flame className="size-3.5 text-orange-400" />#{index + 1} Trending today
          </span>

          {slide.logo ? (
            <Fragment>
              <h2 className="sr-only">{slide.title}</h2>
              <Image src={slide.logo.src} alt="" width={slide.logo.width} height={slide.logo.height} sizes="420px" quality={90} className="mt-5 h-auto max-h-24 w-auto max-w-[min(420px,85%)] object-contain object-left brightness-0 invert drop-shadow-[0_4px_16px_rgb(0_0_0/0.5)] sm:max-h-28" />
            </Fragment>
          ) : (
            <h2 className="mt-4 text-4xl font-medium leading-tight tracking-tight sm:text-5xl">{slide.title}</h2>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
            {slide.rating > 0 ? (
              <span className="flex items-center gap-1 font-medium text-white">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {slide.rating.toFixed(1)}
              </span>
            ) : (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium">New</span>
            )}
            {meta.map((m) => (
              <span key={m} className="flex items-center gap-3 before:size-1 before:rounded-full before:bg-white/40">
                {m}
              </span>
            ))}
            {slide.genres.length > 0 && (
              <span className="flex items-center gap-3 before:size-1 before:rounded-full before:bg-white/40 max-sm:basis-full max-sm:before:hidden">
                {slide.genres.join(", ")}
              </span>
            )}
          </div>

          <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-white/75 sm:line-clamp-2 lg:line-clamp-3">{slide.overview}</p>

          <div className="mt-6 flex gap-3 *:max-sm:flex-1 *:max-sm:justify-center *:max-sm:px-4">
            {slide.trailerKey && (
              <button type="button" onClick={() => setTrailer(slide)} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-night shadow-lg transition hover:bg-white/90">
                <Play className="size-4 fill-current" /> <span className="sm:hidden">Trailer</span><span className="max-sm:hidden">Watch trailer</span>
              </button>
            )}
            <Link href={`/${slide.mediaType}/${slide.id}`} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-medium ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25">
              <Info className="size-4" /> <span className="sm:hidden">Details</span><span className="max-sm:hidden">View details</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute right-5 top-5 z-10 flex flex-col items-end gap-5 lg:bottom-10 lg:right-10 lg:top-auto">
        {upNext.length > 0 && (
          <div className="hidden xl:block">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-white/60">Up next</p>
            <ul className="flex gap-3">
              {upNext.map((i) => (
                <li key={slides[i].id}>
                  <button type="button" onClick={() => goTo(i)} aria-label={`Show ${slides[i].title}`} className="group block w-32 text-left">
                    <span className="relative block aspect-video overflow-hidden rounded-xl ring-1 ring-white/20 transition group-hover:ring-white/60">
                      <Image src={slides[i].thumb} alt="" fill sizes="128px" quality={75} className="object-cover transition duration-500 group-hover:scale-105" />
                    </span>
                    <span className="mt-1.5 block truncate text-xs text-white/75 group-hover:text-white">{slides[i].title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {count > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium tabular-nums text-white/80">{String(index + 1).padStart(2, "0")}</span>
            <span className="relative h-0.5 w-16 overflow-hidden rounded-full bg-white/25 sm:w-24">
              {autoplay ? (
                <span key={index} onAnimationEnd={next} style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused ? "paused" : "running" } as CSSProperties} className="animate-progress absolute inset-0 origin-left rounded-full bg-white" />
              ) : (
                <span className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${((index + 1) / count) * 100}%` }} />
              )}
            </span>
            <span className="text-xs font-medium tabular-nums text-white/50">{String(count).padStart(2, "0")}</span>
            <div className="ml-1 flex gap-2">
              <button type="button" onClick={prev} aria-label="Previous movie" className="grid size-9 place-items-center rounded-full bg-white/12 ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25 sm:size-10 touch:size-11">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" onClick={next} aria-label="Next movie" className="grid size-9 place-items-center rounded-full bg-white/12 ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25 sm:size-10 touch:size-11">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live={paused ? "polite" : "off"}> {`Slide ${index + 1} of ${count}: ${slide.title}`} </p>

      <dialog ref={dialogRef} aria-label={trailer ? `${trailer.title} trailer` : "Trailer"} onClose={() => setTrailer(null)} onClick={(e) => {
        if (e.target === e.currentTarget) setTrailer(null);
      }} className="m-auto w-[min(960px,92vw)] overflow-visible bg-transparent p-0 backdrop:bg-night/80 backdrop:backdrop-blur-sm">
        {trailer?.trailerKey && (
          <div className="relative">
            <button type="button" onClick={() => setTrailer(null)} aria-label="Close trailer" className="absolute -top-12 right-0 grid size-10 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/25 transition hover:bg-white/30">
              <X className="size-5" />
            </button>
            <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl">
              <iframe src={`https://www.youtube-nocookie.com/embed/${trailer.trailerKey}?autoplay=1&rel=0`} title={`${trailer.title} trailer`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="size-full" />
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
