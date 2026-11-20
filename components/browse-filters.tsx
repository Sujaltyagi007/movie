"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { imageUrl } from "@/lib/catalog";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";

export type FilterOption = {
  id: number;
  name: string;
  logoPath?: string | null;
  active: boolean;
  href: string;
};

type BrowseFiltersProps = {
  region: string;
  providers: FilterOption[];
  genres: FilterOption[];
  clearHref: string;
};

export function BrowseFilters({ region, providers, genres, clearHref }: BrowseFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeFilters = [
    ...providers.filter((p) => p.active),
    ...genres.filter((g) => g.active),
  ];
  const hasFilters = providers.length > 0 || genres.length > 0;
  if (!hasFilters) return null;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen((prev) => !prev)} aria-expanded={open} className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition sm:px-4 sm:py-2 sm:text-sm ${open || activeFilters.length > 0 ? "bg-paper text-ink shadow-sm ring-1 ring-ink/15" : "bg-paper/70 text-ink/75 ring-1 ring-ink/8 hover:bg-paper hover:text-ink"}`}>
          <SlidersHorizontal className="size-3.5" />
          <span>Filters</span>
          {activeFilters.length > 0 && (
            <span className="grid size-4.5 place-items-center rounded-full bg-accent text-[11px] font-semibold text-white tabular-nums">
              {activeFilters.length}
            </span>
          )}
          <ChevronDown className={`size-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {activeFilters.map((item) => (
          <Link key={`${item.logoPath !== undefined ? "p" : "g"}-${item.id}`} href={item.href} aria-label={`Remove ${item.name} filter`} className="inline-flex items-center gap-1.5 rounded-full bg-accent/12 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20 sm:text-sm">
            <span>{item.name}</span>
            <X className="size-3.5" />
          </Link>
        ))}

        {activeFilters.length > 1 && (
          <Link href={clearHref} className="rounded-full px-2.5 py-1 text-xs font-medium text-muted transition hover:text-ink">
            Clear all
          </Link>
        )}
      </div>

      {open && (
        <div className="animate-rise mt-3 rounded-2xl bg-paper/90 p-4 shadow-card ring-1 ring-ink/8 backdrop-blur sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink">Filter results</p>
            <div className="flex items-center gap-2">
              {activeFilters.length > 0 && (
                <Link href={clearHref} onClick={() => setOpen(false)} className="rounded-full px-2.5 py-1 text-xs font-medium text-accent transition hover:bg-accent/10">
                  Reset
                </Link>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-ink/8 hover:text-ink">
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {providers.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted">
                  Streaming on · {region}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {providers.map((p) => {
                    const logo = imageUrl(p.logoPath, "w92");
                    return (
                      <li key={p.id}>
                        <Link
                          href={p.href}
                          aria-pressed={p.active}
                          onClick={() => setOpen(false)}
                          className={`inline-flex items-center gap-2 rounded-full p-1 pr-3 text-xs font-medium transition sm:text-sm ${p.active
                            ? "bg-ink text-paper shadow-sm"
                            : "bg-ink/5 text-ink/80 hover:bg-ink/10 hover:text-ink"
                            }`}
                        >
                          {logo && <Image src={logo} alt="" width={24} height={24} className="size-6 rounded-full" />}
                          <span>{p.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {genres.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted">Genres</p>
                <ul className="flex flex-wrap gap-1.5 sm:gap-2">
                  {genres.map((g) => (
                    <li key={g.id}>
                      <Link
                        href={g.href}
                        aria-pressed={g.active}
                        onClick={() => setOpen(false)}
                        className={`block rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm ${g.active
                          ? "bg-ink text-paper shadow-sm"
                          : "bg-ink/5 text-ink/80 hover:bg-ink/10 hover:text-ink"
                          }`}
                      >
                        {g.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
