import Link from "next/link";
import Image from "next/image";
import { Film, Star, Tv } from "lucide-react";
import { imageUrl, mediaHref, releaseYear, type Media } from "@/lib/catalog";

const MAX_BADGES = 3;

/** Logos of the services a title streams on, along the bottom of the poster. */
function ProviderBadges({ providers }: { providers: NonNullable<Media["providers"]> }) {
  const shown = providers.slice(0, MAX_BADGES);
  const extra = providers.length - shown.length;
  const names = providers.map((p) => p.name).join(", ");
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-linear-to-t from-black/70 to-transparent px-2 pb-2 pt-6" title={`Stream on ${names}`}>
      <span className="sr-only">Stream on {names}</span>
      {shown.map((p) => {
        const logo = imageUrl(p.logoPath, "w92");
        return logo ? (
          <Image key={p.id} src={logo} alt="" width={24} height={24} className="size-6 rounded-md ring-1 ring-white/30" />
        ) : (
          <span key={p.id} className="grid size-6 place-items-center rounded-md bg-white/90 text-[10px] font-semibold text-night">{p.name[0]}</span>
        );
      })}
      {extra > 0 && <span className="ml-0.5 text-[11px] font-medium text-white/90">+{extra}</span>}
    </div>
  );
}

export function MediaCard({ item, showType = false, sizes }: { item: Media; showType?: boolean; sizes: string }) {
  const poster = imageUrl(item.posterPath, "w342");
  const Fallback = item.mediaType === "tv" ? Tv : Film;
  return (
    <Link href={mediaHref(item)} className="group block rounded-2xl outline-accent focus-visible:outline-2 focus-visible:outline-offset-4">
      <div className="relative aspect-2/3 overflow-hidden rounded-2xl bg-paper shadow-card ring-1 ring-ink/5 transition duration-300 group-hover:-translate-y-1">
        {poster ? (
          <Image src={poster} alt={item.title} fill sizes={sizes} className="object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center text-muted">
            <Fallback className="size-8" strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-1">
          {item.rating > 0 ? (
            <span className="flex items-center gap-1 rounded-full bg-paper/90 px-2 py-0.5 text-xs font-medium text-ink backdrop-blur">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {item.rating.toFixed(1)}
            </span>
          ) : (<span />)}
          {showType && item.mediaType === "tv" && (<span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">Series</span>)}
        </div>
        {item.providers && item.providers.length > 0 && <ProviderBadges providers={item.providers} />}
      </div>
      <p className="mt-2.5 truncate text-[15px] font-medium">{item.title}</p>
      <p className="text-[13px] text-muted">{releaseYear(item.date)}</p>
    </Link>
  );
}
