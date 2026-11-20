"use client";

import Link from "next/link";
import { useState } from "react";
import type { Genre } from "@/lib/tmdb";
import type { MediaType } from "@/lib/catalog";
import { ArrowRight, ChevronRight, Clapperboard, Compass, Drama, Film, Flame, Ghost, Heart, Landmark, Laugh, Music, Rocket, Search, ShieldAlert, Sparkles, Sun, Swords, Tv, Users, Video, WandSparkles, Zap, type LucideIcon } from "lucide-react";

type GenreStyle = {
  icon: LucideIcon;
  hue: number;
  hint: string;
};

const GENRE_META: Record<number, GenreStyle> = {
  28: { icon: Flame, hue: 14, hint: "High-octane hits" },
  12: { icon: Compass, hue: 198, hint: "Epic journeys" },
  16: { icon: Sparkles, hue: 38, hint: "Animated worlds" },
  35: { icon: Laugh, hue: 46, hint: "Laughs & wit" },
  80: { icon: ShieldAlert, hue: 222, hint: "Heists & noir" },
  99: { icon: Video, hue: 170, hint: "True stories" },
  18: { icon: Drama, hue: 258, hint: "Character-driven" },
  10751: { icon: Users, hue: 152, hint: "All ages" },
  14: { icon: WandSparkles, hue: 286, hint: "Myth & magic" },
  36: { icon: Landmark, hue: 28, hint: "Past eras" },
  27: { icon: Ghost, hue: 350, hint: "Chills & scares" },
  10402: { icon: Music, hue: 318, hint: "Rhythm & stage" },
  9648: { icon: Search, hue: 238, hint: "Whodunits" },
  10749: { icon: Heart, hue: 340, hint: "Love stories" },
  878: { icon: Rocket, hue: 205, hint: "Space & future" },
  10770: { icon: Tv, hue: 215, hint: "Made for screen" },
  53: { icon: Zap, hue: 6, hint: "Edge of seat" },
  10752: { icon: Swords, hue: 18, hint: "Frontline stories" },
  37: { icon: Sun, hue: 32, hint: "Frontier tales" },
  10759: { icon: Flame, hue: 14, hint: "Action & quests" },
  10762: { icon: Sparkles, hue: 44, hint: "Young viewers" },
  10763: { icon: Tv, hue: 210, hint: "Current events" },
  10764: { icon: Clapperboard, hue: 295, hint: "Unscripted" },
  10765: { icon: Rocket, hue: 252, hint: "Other worlds" },
  10766: { icon: Heart, hue: 334, hint: "Serialized drama" },
  10767: { icon: Music, hue: 182, hint: "Late night & interviews" },
  10768: { icon: Swords, hue: 224, hint: "Power & conflict" },
};

function getGenreMeta(genre: Genre): GenreStyle {
  return (
    GENRE_META[genre.id] ?? {
      icon: Film,
      hue: (genre.id * 47) % 360,
      hint: "Curated picks",
    }
  );
}

type GenreBrowseProps = {
  movieGenres: Genre[];
  tvGenres: Genre[];
};

export function GenreBrowse({ movieGenres, tvGenres }: GenreBrowseProps) {
  const hasTv = tvGenres.length > 0;
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const activeType: MediaType = mediaType === "tv" && hasTv ? "tv" : "movie";
  const genres = activeType === "tv" ? tvGenres : movieGenres;
  const baseHref = activeType === "tv" ? "/tv" : "/movies";
  const allLabel = activeType === "tv" ? "All TV shows" : "All movies";

  if (genres.length === 0) return null;

  return (
    <section aria-labelledby="browse-by-genre" className="mt-12 sm:mt-14">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="browse-by-genre" className="text-xl font-medium tracking-tight">
            Browse by genre
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Pick a mood or category to start exploring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {hasTv && (
            <div role="group" aria-label="Genre media type" className="inline-flex rounded-full bg-paper/75 p-1 shadow-sm ring-1 ring-ink/8 backdrop-blur">
              {([{ type: "movie", label: "Movies" }, { type: "tv", label: "TV Shows" }] as const).map(({ type, label }) => {
                const selected = activeType === type;
                return (
                  <button key={type} type="button" aria-pressed={selected} onClick={() => setMediaType(type)} className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition sm:text-sm ${selected ? "bg-ink text-paper shadow-sm" : "text-muted hover:text-ink"}`} >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          <Link href={baseHref} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-paper/70 hover:text-ink" >
            {allLabel}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {genres.map((genre) => {
          const { icon: Icon, hue, hint } = getGenreMeta(genre);
          return (
            <li key={`${activeType}-${genre.id}`}>
              <Link href={`${baseHref}?genre=${genre.id}`} style={{ "--hue": hue } as React.CSSProperties} className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-paper/85 p-3 shadow-card ring-1 ring-ink/8 backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-paper hover:ring-[hsl(var(--hue)_75%_55%/0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-3.5">
                <span aria-hidden className="pointer-events-none absolute -right-5 -top-5 size-16 rounded-full bg-[hsl(var(--hue)_80%_55%/0.08)] transition duration-300 group-hover:scale-150 group-hover:bg-[hsl(var(--hue)_80%_55%/0.16)]" />
                <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-[hsl(var(--hue)_80%_52%/0.12)] text-[hsl(var(--hue)_65%_42%)] transition duration-200 group-hover:scale-105 dark:bg-[hsl(var(--hue)_80%_60%/0.18)] dark:text-[hsl(var(--hue)_85%_72%)] sm:size-10">
                  <Icon className="size-4.5 sm:size-5" strokeWidth={1.9} />
                </span>
                <span className="relative min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink sm:text-[15px]">
                    {genre.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {hint}
                  </span>
                </span>
                <ChevronRight aria-hidden className="relative hidden size-4 shrink-0 text-muted/70 transition duration-200 group-hover:translate-x-0.5 group-hover:text-ink sm:block" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
