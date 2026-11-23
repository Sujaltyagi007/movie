import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment, Suspense } from "react";
import { MediaRow } from "@/components/media-row";
import { CalendarClock, Clock, ExternalLink } from "lucide-react";
import { formatRuntime, imageUrl, releaseYear } from "@/lib/catalog";
import { getMovie, getPrerenderIds, type MovieDetails } from "@/lib/tmdb";
import { findPublicDomainMovie, type PublicDomainMovie } from "@/lib/archive";
import { MoviePlayer, TrailerButton, VideoPlayButton } from "@/features/player";
import { BackLink, CastRow, DetailActions, DetailHero, HeroActions, DetailSkeleton, Fact, Overview, WatchProviders } from "@/components/detail";

const PRERENDER_COUNT = 30;

export function generateStaticParams() {
  return getPrerenderIds("movie", PRERENDER_COUNT);
}

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

type PublicDomainLookup = Promise<PublicDomainMovie | null>;

async function MovieDetail({ params }: Pick<PageProps<"/movie/[id]">, "params">) {
  const movie = await getMovie((await params).id);
  if (!movie) notFound();
  const publicDomain: PublicDomainLookup = findPublicDomainMovie({
    title: movie.title,
    releaseDate: movie.date,
    runtimeMinutes: movie.runtime,
  });

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
    <Suspense key="public-domain" fallback={null}>
      <PublicDomainBadge lookup={publicDomain} />
    </Suspense>,
  ];

  const actions = (
    <Suspense fallback={<DetailActions details={movie} />}>
      <MovieActions movie={movie} lookup={publicDomain} />
    </Suspense>
  );

  return (
    <Fragment>
      <DetailHero details={movie} facts={facts} actions={actions} />
      <Suspense fallback={null}>
        <PublicDomainWatch movie={movie} lookup={publicDomain} />
      </Suspense>
      <Overview text={movie.overview} />
      <WatchProviders watch={movie.watch} title={movie.title} originalLanguage={movie.originalLanguage} />
      <CastRow cast={movie.cast} />
      <MediaRow title="More like this" items={movie.related} />
    </Fragment>
  );
}

async function PublicDomainBadge({ lookup }: { lookup: PublicDomainLookup }) {
  if (!(await lookup)) return null;
  return (
    <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-medium text-emerald-200 ring-1 ring-emerald-400/35" >
      Free · Public Domain
    </span>
  );
}

async function MovieActions({ movie, lookup }: { movie: MovieDetails; lookup: PublicDomainLookup }) {
  if (!(await lookup)) return <DetailActions details={movie} />;
  return (
    <HeroActions>
      <VideoPlayButton href="#watch" label="Watch full movie" title={movie.title} mediaId={movie.id} imdbId={movie.imdbId} mediaType="movie" />
      {movie.trailerKey && <TrailerButton videoKey={movie.trailerKey} trailers={movie.trailers} title={movie.title} variant="glass" />}
    </HeroActions>
  );
}

async function PublicDomainWatch({ movie, lookup }: { movie: MovieDetails; lookup: PublicDomainLookup }) {
  const publicDomain = await lookup;
  if (!publicDomain) return null;
  const backdrop = imageUrl(movie.backdropPath, "w1280");
  return (
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
  );
}
