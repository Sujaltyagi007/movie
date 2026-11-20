import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { MediaCard } from "@/components/media-card";
import { imageUrl, type Media } from "@/lib/catalog";
import { RowScroller } from "@/components/row-scroller";

const CARD_SIZES = "(min-width: 640px) 176px, 144px";

export function MediaRow({ title, items, href, showType = false, logoPath, icon }: { title: string; items: Media[]; href?: string; showType?: boolean; logoPath?: string | null; icon?: ReactNode; }) {
  const visible = items.filter((m) => m.posterPath);
  if (visible.length === 0) return null;
  const logo = imageUrl(logoPath, "w92");

  return (
    <section className="mt-10 sm:mt-12">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex min-w-0 items-center gap-2.5 text-xl font-medium tracking-tight">
          {logo && <Image src={logo} alt="" width={32} height={32} className="size-8 shrink-0 rounded-lg shadow-sm" />}
          {icon}
          <span className="truncate">{title}</span>
        </h2>
        {href && (
          <Link href={href} className="flex shrink-0 items-center gap-0.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-paper/70 hover:text-ink">
            See all <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
      <RowScroller label={title}>
        {visible.map((item) => (
          <li key={`${item.mediaType}-${item.id}`} className="w-36 shrink-0 snap-start sm:w-44">
            <MediaCard item={item} showType={showType} sizes={CARD_SIZES} />
          </li>
        ))}
      </RowScroller>
    </section>
  );
}

export function MediaRowSkeleton() {
  return (
    <div aria-hidden className="mt-10 sm:mt-12">
      <div className="mb-4 h-7 w-56 animate-pulse rounded-lg bg-paper/70" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="w-36 shrink-0 sm:w-44">
            <div className="aspect-2/3 animate-pulse rounded-2xl bg-paper/70" />
            <div className="mt-2.5 h-4 w-3/4 animate-pulse rounded bg-paper/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
