import { Film } from "lucide-react";
import type { Media } from "@/lib/catalog";
import { MediaCard } from "@/components/media-card";

const GRID = "grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";
const SIZES = "(min-width: 1280px) 15vw, (min-width: 1024px) 18vw, (min-width: 768px) 22vw, (min-width: 640px) 30vw, 45vw";

export function MediaGrid({ title, items, showType = false, count, emptyHint = "Try a different title, or browse a category instead." }: { title?: string; items: Media[]; showType?: boolean; count?: string; emptyHint?: string; }) {
  return (
    <div>
      {title && (
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-medium tracking-tight">{title}</h2>
          <span className="shrink-0 text-sm text-muted">{count ?? `${items.length} titles`}</span>
        </div>
      )}

      {items.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-dashed border-ink/15 bg-paper/50 px-6 py-16 text-center">
          <Film className="size-8 text-muted" strokeWidth={1.5} />
          <p className="mt-3 font-medium">Nothing found</p>
          <p className="mt-1 text-sm text-muted">{emptyHint}</p>
        </div>
      ) : (
        <ul className={GRID}>
          {items.map((item) => (
            <li key={`${item.mediaType}-${item.id}`}>
              <MediaCard item={item} showType={showType} sizes={SIZES} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MediaGridSkeleton({ withTitle = true }: { withTitle?: boolean }) {
  return (
    <div aria-hidden>
      {withTitle && <div className="mb-5 h-7 w-48 animate-pulse rounded-lg bg-paper/70" />}
      <ul className={GRID}>
        {Array.from({ length: 12 }, (_, i) => (
          <li key={i}>
            <div className="aspect-2/3 animate-pulse rounded-2xl bg-paper/70" />
            <div className="mt-2.5 h-4 w-3/4 animate-pulse rounded bg-paper/70" />
          </li>
        ))}
      </ul>
    </div>
  );
}
