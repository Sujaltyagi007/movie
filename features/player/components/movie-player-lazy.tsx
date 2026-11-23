"use client";
import dynamic from "next/dynamic";
import { LoaderCircle } from "lucide-react";
import { preloadHls } from "@/features/player/hooks/use-hls";

const loadMoviePlayer = () => import("@/features/player/components/movie-player");

export const LazyMoviePlayer = dynamic(() => loadMoviePlayer().then((m) => m.MoviePlayer), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center bg-black text-white/80">
      <LoaderCircle className="size-9 animate-spin" strokeWidth={1.5} />
    </div>
  ),
});

export function preloadMoviePlayer() {
  void loadMoviePlayer().catch(() => undefined);
  preloadHls();
}
