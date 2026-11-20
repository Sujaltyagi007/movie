"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function RowScroller({ children, label }: { children: ReactNode; label: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () =>
      setEdges({ start: list.scrollLeft <= 4, end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 4 });
    update();
    list.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(list);
    return () => {
      list.removeEventListener("scroll", update);
      resize.disconnect();
    };
  }, []);

  const scroll = (direction: 1 | -1) => {
    const list = listRef.current;
    list?.scrollBy({ left: direction * list.clientWidth * 0.85, behavior: "smooth" });
  };

  const button =
    "absolute top-[38%] z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-paper text-ink shadow-card ring-1 ring-ink/10 transition hover:scale-105 disabled:pointer-events-none disabled:opacity-0 group-hover/row:opacity-100 md:grid md:opacity-0";

  return (
    <div className="group/row relative">
      <ul ref={listRef} aria-label={label} className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-1 sm:scroll-px-1 sm:px-1">
        {children}
      </ul>
      <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)} disabled={edges.start} className={`${button} -left-3`}>
        <ChevronLeft className="size-5" />
      </button>
      <button type="button" aria-label="Scroll right" onClick={() => scroll(1)} disabled={edges.end} className={`${button} -right-3`}>
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
