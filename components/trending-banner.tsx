import { BannerCarousel, type BannerSlide } from "@/components/banner-carousel";
import { getBannerExtras, getGenreNames, getTrending, imageUrl, releaseYear } from "@/lib/tmdb";

const SLIDE_COUNT = 6;

export async function TrendingBanner() {
  const [trending, genreNames] = await Promise.all([
    getTrending("all", "day").catch((error) => {
      console.error("[home] banner skipped:", error instanceof Error ? error.message : error);
      return [];
    }),
    getGenreNames().catch(() => ({}) as Record<number, string>),
  ]);
  const top = trending.filter((m) => m.backdropPath && m.overview).slice(0, SLIDE_COUNT);
  const extras = await Promise.all(top.map((m) => getBannerExtras(m.mediaType, m.id).catch(() => null)));

  const slides: BannerSlide[] = top.map((item, i) => {
    const extra = extras[i];
    const logo = extra?.logo;
    return {
      id: item.id,
      mediaType: item.mediaType,
      title: item.title,
      overview: item.overview,
      backdrop: imageUrl(item.backdropPath, "original")!,
      thumb: imageUrl(item.backdropPath, "w780")!,
      logo: logo ? { ...logo, src: imageUrl(logo.path, logo.path.endsWith(".svg") ? "w500" : "original")! } : null,
      year: releaseYear(item.date),
      rating: item.rating,
      runtime: extra?.runtime ?? null,
      genres: (extra?.genres ?? item.genreIds.map((id) => genreNames[id]).filter(Boolean)).slice(0, 3),
      trailerKey: extra?.trailerKey ?? null,
    };
  });

  if (slides.length === 0) return null;
  return <BannerCarousel slides={slides} />;
}

export function TrendingBannerSkeleton() {
  return <div aria-hidden className="h-140 animate-pulse rounded-[28px] bg-paper/70 sm:h-150 lg:h-[min(680px,78vh)]" />;
}
