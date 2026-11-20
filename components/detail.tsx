import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { imageUrl, releaseYear } from "@/lib/catalog";
import { ArrowLeft, ExternalLink, Star, UserRound } from "lucide-react";
import { TrailerButton } from "@/components/trailer-button";
import { HeroStage } from "@/components/hero-player";
import { VideoPlayButton } from "@/components/VideoPlayButton";
import { REGION, type CastMember, type Details, type Provider, type Season, type WatchOptions } from "@/lib/tmdb";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-muted transition hover:bg-paper/70 hover:text-ink">
      <ArrowLeft className="size-4" /> {label}
    </Link>
  );
}

export function DetailHero({ details, facts, children, actions }: { details: Details; facts: ReactNode[]; children?: ReactNode; actions?: ReactNode; }) {
  const backdrop = imageUrl(details.backdropPath, "w1280");
  const poster = imageUrl(details.posterPath, "w500");
  return (
    // "Watch trailer" inside turns this hero into an inline player (see HeroStage).
    <HeroStage title={details.title}>
    <section className="animate-rise relative mt-4 overflow-hidden rounded-[28px] bg-night text-white shadow-card">
      {backdrop && (
        <Image src={backdrop} alt="" fill priority sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover opacity-70" />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-night via-night/75 to-night/10" />
      <div className="absolute inset-0 bg-linear-to-r from-night/80 to-transparent" />

      <div className="relative flex min-h-110 flex-col justify-end gap-6 p-5 sm:flex-row sm:items-end sm:justify-start sm:p-10">
        {poster && (
          <Image src={poster} alt={`${details.title} poster`} width={200} height={300} className="w-28 shrink-0 rounded-2xl shadow-2xl ring-1 ring-white/20 sm:w-48" />
        )}
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/75">
            {details.rating > 0 && (
              <span className="flex items-center gap-1.5 font-medium text-white">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {details.rating.toFixed(1)}
              </span>
            )}
            {facts}
          </div>
          <h1 className="mt-3 text-3xl font-medium leading-tight tracking-tight sm:text-5xl">{details.title}</h1>
          {details.tagline && <p className="mt-2 text-white/70">{details.tagline}</p>}
          {details.genres.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {details.genres.map((g) => (
                <li key={g.id}>
                  <Link href={`/${details.mediaType === "movie" ? "movies" : "tv"}?genre=${g.id}`} className="block rounded-full bg-white/12 px-3 py-1 text-xs backdrop-blur transition hover:bg-white/25">
                    {g.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {children}
          {actions ?? (details.trailerKey && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <VideoPlayButton  label="Play video" target="_blank" title={details.title} mediaId={details.id} mediaType={details.mediaType} />
              <TrailerButton videoKey={details.trailerKey} title={details.title} />
            </div>
          ))}
        </div>
      </div>
    </section>
    </HeroStage>
  );
}

export function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      {icon}
      {children}
    </span>
  );
}

export function Overview({ text }: { text: string }) {
  if (!text) return null;
  return (
    <section className="mt-10 max-w-7xl">
      <h2 className="text-xl font-medium tracking-tight">Storyline</h2>
      <p className="mt-3 text-[17px] leading-relaxed text-ink/80">{text}</p>
    </section>
  );
}

function ProviderLogos({ label, providers }: { label: string; providers: Provider[] }) {
  if (!providers.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted">{label}</p>
      <ul className="flex flex-wrap gap-2.5">
        {providers.map((p) => {
          const logo = imageUrl(p.logoPath, "w92");
          return (
            <li key={p.id} title={p.name} className="flex items-center gap-2 rounded-2xl bg-paper p-1.5 pr-3.5 shadow-card ring-1 ring-ink/5">
              {logo && <Image src={logo} alt="" width={36} height={36} className="size-9 rounded-xl" />}
              <span className="text-sm font-medium">{p.name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function WatchProviders({ watch }: { watch: WatchOptions | null }) {
  if (!watch) return null;
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-medium tracking-tight">Where to watch</h2>
        {watch.link && (
          <a href={watch.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink">
            All options in {REGION} <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-5">
        <ProviderLogos label="Stream" providers={watch.stream} />
        <ProviderLogos label="Rent" providers={watch.rent} />
        <ProviderLogos label="Buy" providers={watch.buy} />
      </div>
      <p className="mt-4 text-xs text-muted">Availability data provided by JustWatch.</p>
    </section>
  );
}

export function CastRow({ cast }: { cast: CastMember[] }) {
  if (!cast.length) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-medium tracking-tight">Top cast</h2>
      <ul className="no-scrollbar -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-1 sm:px-1">
        {cast.map((person) => {
          const photo = imageUrl(person.profile_path, "w185");
          return (
            <li key={person.id} className="w-32 shrink-0 rounded-2xl bg-paper p-2.5 shadow-card sm:w-36 sm:p-2">
              <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-ink/5">
                {photo ? (
                  <Image src={photo} alt={person.name} fill sizes="144px" className="object-cover" />
                ) : (
                  <UserRound className="absolute inset-0 m-auto size-8 text-muted" strokeWidth={1.5} />
                )}
              </div>
              <p className="mt-2.5 truncate text-sm font-medium">{person.name}</p>
              <p className="truncate text-xs text-muted">{person.character || "—"}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function SeasonsRow({ seasons }: { seasons: Season[] }) {
  if (!seasons.length) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-medium tracking-tight">
        Seasons <span className="text-muted">· {seasons.filter((s) => s.number > 0).length}</span>
      </h2>
      <ul className="no-scrollbar -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-1 sm:px-1">
        {seasons.map((s) => {
          const poster = imageUrl(s.posterPath, "w185");
          return (
            <li key={s.id} className="w-32 shrink-0 sm:w-36">
              <div className="relative aspect-2/3 overflow-hidden rounded-2xl bg-paper shadow-card ring-1 ring-ink/5">
                {poster ? (
                  <Image src={poster} alt={s.name} fill sizes="144px" className="object-cover" />
                ) : (
                  <span className="grid h-full place-items-center px-3 text-center text-sm font-medium text-muted">{s.name}</span>
                )}
              </div>
              <p className="mt-2.5 truncate text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted">
                {s.episodes} episode{s.episodes === 1 ? "" : "s"} · {releaseYear(s.date)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function DetailSkeleton() {
  return (
    <div aria-hidden>
      <div className="mt-4 h-110 animate-pulse rounded-[28px] bg-paper/70" />
      <div className="mt-10 h-6 w-40 animate-pulse rounded-lg bg-paper/70" />
      <div className="mt-4 h-24 max-w-3xl animate-pulse rounded-xl bg-paper/70" />
    </div>
  );
}
