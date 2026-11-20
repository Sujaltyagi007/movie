"use client";
import type { Media } from "@/lib/catalog";
import { MediaGrid } from "@/components/media-grid";
import { ArrowUp, LoaderCircle, RotateCcw } from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";

type Props = {
  query: string;
  initialItems: Media[];
  initialPage: number;
  totalPages: number;
  title?: string;
  showType?: boolean;
  emptyHint?: string;
};

type PageResponse = { items: Media[]; page: number; totalPages: number };

const itemKey = (m: Media) => `${m.mediaType}-${m.id}`;

export function InfiniteMediaGrid({ query, initialItems, initialPage, totalPages: initialTotal, title, showType, emptyHint }: Props) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotal);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [announcement, setAnnouncement] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef<AbortController | null>(null);
  const hasMore = page < totalPages;

  const loadMore = useCallback(async () => {
    if (inFlight.current || !hasMore) return;
    const controller = new AbortController();
    inFlight.current = controller;
    setStatus("loading");
    try {
      const res = await fetch(`/api/titles?${query}&page=${page + 1}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as PageResponse;
      setItems((prev) => {
        const seen = new Set(prev.map(itemKey));
        const fresh = data.items.filter((m) => !seen.has(itemKey(m)));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
      setPage((p) => Math.max(p + 1, data.page));
      setTotalPages(data.totalPages);
      setAnnouncement(`Loaded page ${data.page} of ${data.totalPages}`);
      setStatus("idle");
    } catch {
      setStatus(controller.signal.aborted ? "idle" : "error");
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [query, page, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || status !== "idle") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "0px 0px 1200px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, status, loadMore]);

  useEffect(() => () => inFlight.current?.abort(), []);

  const button = "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition touch:py-3";

  return (
    <div>
      {items.length === 0 && hasMore && status !== "error" ? (
        // A filtered feed (e.g. search on one platform) can come back empty while later pages
        // still have matches — keep looking instead of claiming nothing was found.
        <div>
          {title && <h2 className="mb-4 text-xl font-medium tracking-tight">{title}</h2>}
          <p className="inline-flex items-center gap-2 py-10 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin" /> Looking further for matches…
          </p>
        </div>
      ) : (
        <MediaGrid title={title} items={items} showType={showType} emptyHint={emptyHint} />
      )}

      <div ref={sentinelRef} aria-hidden className="h-px" />

      {items.length > 0 && (
        <div className="mt-10 flex min-h-12 flex-col items-center justify-center gap-3 text-center">
          {status === "loading" ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted">
              <LoaderCircle className="size-4 animate-spin" /> Loading more…
            </p>
          ) : status === "error" ? (
            <Fragment>
              <p className="text-sm text-muted">Couldn&apos;t load more titles.</p>
              <button type="button" onClick={() => void loadMore()} className={`${button} bg-ink text-paper shadow-md hover:bg-ink-soft`}>
                <RotateCcw className="size-4" /> Try again
              </button>
            </Fragment>
          ) : hasMore ? (
            <button type="button" onClick={() => void loadMore()} className={`${button} bg-paper text-ink shadow-card hover:bg-paper/80`}>
              Load more
            </button>
          ) : page > 1 ? (
            <Fragment>
              <p className="text-sm text-muted">You&apos;ve reached the end · {items.length} titles</p>
              <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className={`${button} bg-paper text-ink shadow-card hover:bg-paper/80`}>
                <ArrowUp className="size-4" /> Back to top
              </button>
            </Fragment>
          ) : null}
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
