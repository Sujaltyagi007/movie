import type { Metadata } from "next";
import { getMovie } from "@/lib/tmdb";
import { notFound } from "next/navigation";
import { Fragment, Suspense } from "react";
import { MediaRow } from "@/components/media-row";
import { findPublicDomainMovie } from "@/lib/archive";
import { MoviePlayer } from "@/components/movie-player";
import { TrailerButton } from "@/components/trailer-button";
import { VideoPlayButton } from "@/components/VideoPlayButton";
import { CalendarClock, Clock, ExternalLink } from "lucide-react";
import { formatRuntime, imageUrl, releaseYear } from "@/lib/catalog";
import { BackLink, CastRow, DetailHero, DetailSkeleton, Fact, Overview, WatchProviders } from "@/components/detail";

export async function generateMetadata({ params }: PageProps<"/movie/[id]">): Promise<Metadata> {
  const movie = await getMovie((await params).id);
  return movie ? { title: movie.title, description: movie.overview } : { title: "Movie not found" };
}

export default function MoviePage({ params }: PageProps<"/movie/[id]">) {
  return (
    <div className="mx-auto w-full max-w-6xl pt-6">
      <BackLink href="/movies" label="All movies" />
      <Suspense fallback={<DetailSkeleton />}>
        <MovieDetail params={params} />
      </Suspense>
    </div>
  );
}

async function MovieDetail({ params }: Pick<PageProps<"/movie/[id]">, "params">) {
  const movie = await getMovie((await params).id);
  if (!movie) notFound();

  const publicDomain = await findPublicDomainMovie({
    title: movie.title,
    releaseDate: movie.date,
    runtimeMinutes: movie.runtime,
  });

  const backdrop = imageUrl(movie.backdropPath, "w1280");
  const runtime = formatRuntime(movie.runtime);

  const facts = [
    <Fact key="year" icon={<CalendarClock className="size-4" strokeWidth={1.75} />}>
      {releaseYear(movie.date)}
    </Fact>,
    runtime && (
      <Fact key="runtime" icon={<Clock className="size-4" strokeWidth={1.75} />}>
        {runtime}
      </Fact>
    ),
    publicDomain && (
      <span key="public-domain" className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-medium text-emerald-200 ring-1 ring-emerald-400/35" >
        Free · Public Domain
      </span>
    ),
  ];

  const actions = publicDomain ? (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <VideoPlayButton href="#watch" label="Watch full movie" title={movie.title} mediaId={movie.id} imdbId={movie.imdbId} mediaType="movie" />
      {movie.trailerKey && <TrailerButton videoKey={movie.trailerKey} trailers={movie.trailers} title={movie.title} variant="glass" />}
    </div>
  ) : undefined;

  return (
    <Fragment>
      <DetailHero details={movie} facts={facts} actions={actions} />

      {publicDomain && (
        <section id="watch" className="mt-10 scroll-mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-medium tracking-tight">Watch full movie</h2>
              <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">
                Public Domain
              </span>
            </div>
            <a href={publicDomain.archiveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-ink">
              Hosted by Internet Archive <ExternalLink className="size-3.5" />
            </a>
          </div>
          <MoviePlayer title={movie.title} sources={publicDomain.sources} poster={backdrop} archiveUrl={publicDomain.archiveUrl} durationHintSeconds={publicDomain.durationSeconds}
            subtitles={publicDomain.subtitles} audioLanguage={publicDomain.audioLanguage || movie.originalLanguage} />
        </section>
      )}

      <Overview text={movie.overview} />
      <WatchProviders watch={movie.watch} title={movie.title} originalLanguage={movie.originalLanguage} />
      <CastRow cast={movie.cast} />
      <MediaRow title="More like this" items={movie.related} />
    </Fragment>
  );
}
