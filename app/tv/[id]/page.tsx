import Image from "next/image";
import type { Metadata } from "next";
import { Fragment, Suspense } from "react";
import { notFound } from "next/navigation";
import { TvEpisodePlay } from "@/features/player";
import { MediaRow } from "@/components/media-row";
import { getPrerenderIds, getTv } from "@/lib/tmdb";
import { CalendarClock, Clock, Layers, Radio } from "lucide-react";
import { formatRuntime, imageUrl, releaseYear } from "@/lib/catalog";
import { BackLink, CastRow, DetailHero, DetailSkeleton, Fact, Overview, SeasonsRow, WatchProviders } from "@/components/detail";

const PRERENDER_COUNT = 30;

export function generateStaticParams() {
  return getPrerenderIds("tv", PRERENDER_COUNT);
}

export async function generateMetadata({ params }: PageProps<"/tv/[id]">): Promise<Metadata> {
  const show = await getTv((await params).id);
  return show ? { title: show.title, description: show.overview } : { title: "Series not found" };
}

export default function TvShowPage({ params }: PageProps<"/tv/[id]">) {
  return (
    <div className="mx-auto w-full max-w-6xl pt-6">
      <BackLink href="/tv" label="All TV shows" />
      <Suspense fallback={<DetailSkeleton />}>
        <TvDetail params={params} />
      </Suspense>
    </div>
  );
}

async function TvDetail({ params }: Pick<PageProps<"/tv/[id]">, "params">) {
  const show = await getTv((await params).id);
  if (!show) notFound();

  const first = releaseYear(show.date);
  const ended = show.status === "Ended" || show.status === "Canceled";
  const years = ended && show.lastAirDate && releaseYear(show.lastAirDate) !== first ? `${first}–${releaseYear(show.lastAirDate)}` : first;
  const runtime = formatRuntime(show.episodeRuntime);

  const facts = [
    <Fact key="years" icon={<CalendarClock className="size-4" strokeWidth={1.75} />}>
      {years}
    </Fact>,
    <Fact key="seasons" icon={<Layers className="size-4" strokeWidth={1.75} />}>
      {show.seasonCount} season{show.seasonCount === 1 ? "" : "s"} · {show.episodeCount} episodes
    </Fact>,
    runtime && (
      <Fact key="runtime" icon={<Clock className="size-4" strokeWidth={1.75} />}>
        {runtime} / ep
      </Fact>
    ),
    show.status && !ended && (
      <Fact key="status" icon={<Radio className="size-4 text-emerald-400" strokeWidth={1.75} />}>
        {show.status}
      </Fact>
    ),
  ];

  const episodeActions = (
    <TvEpisodePlay id={show.id} imdbId={show.imdbId} title={show.title} seasons={show.seasons} trailerKey={show.trailerKey} trailers={show.trailers} />
  );

  return (
    <Fragment>
      <DetailHero details={show} facts={facts} actions={episodeActions}>
        {(show.creators.length > 0 || show.networks.length > 0) && (
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/75">
            {show.creators.length > 0 && (
              <p> Created by <span className="font-medium text-white">{show.creators.join(", ")}</span> </p>
            )}
            {show.networks.length > 0 && (
              <ul className="flex items-center gap-2">
                {show.networks.slice(0, 3).map((n) => {
                  const logo = imageUrl(n.logoPath, "w154");
                  return (
                    <li key={n.id} title={n.name} className="rounded-lg bg-white/90 px-2 py-1">
                      {logo ? (
                        <Image src={logo} alt={n.name} width={80} height={24} className="h-4 w-auto object-contain" />
                      ) : (
                        <span className="text-xs font-medium text-night">{n.name}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </DetailHero>
      <Overview text={show.overview} />
      <WatchProviders watch={show.watch} title={show.title} originalLanguage={show.originalLanguage} />
      <SeasonsRow seasons={show.seasons} />
      <CastRow cast={show.cast} />
      <MediaRow title="More like this" items={show.related} />
    </Fragment>
  );
}
