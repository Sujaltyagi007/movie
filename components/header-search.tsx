"use client";
import { LoaderCircle, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useRef, useState, useTransition } from "react";

export function HeaderSearch() {
  const params = useSearchParams();
  return <HeaderSearchField key={params.get("q") ?? ""} initialQuery={params.get("q") ?? ""} />;
}

export function HeaderSearchField({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const q = value.trim();
    startTransition(() => router.push(q ? `/search?${new URLSearchParams({ q })}` : "/search"));
  }

  function clear() {
    setValue("");
    if (initialQuery) startTransition(() => router.push("/search"));
    inputRef.current?.focus();
  }

  function toggleMobile() {
    const next = !mobileOpen;
    setMobileOpen(next);
    if (next) requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <Fragment>
      <button
        type="button"
        onClick={toggleMobile}
        aria-label={mobileOpen ? "Close search" : "Search movies"}
        aria-expanded={mobileOpen}
        className="order-3 ml-auto grid size-10 shrink-0 place-items-center rounded-full border border-paper bg-paper/80 text-ink/70 shadow-sm transition hover:bg-paper hover:text-ink md:hidden touch:size-11"
      >
        {mobileOpen ? <X className="size-4.5" /> : <Search className="size-4.5" strokeWidth={1.75} />}
      </button>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={`${
          mobileOpen ? "animate-rise flex" : "hidden"
        } order-5 min-w-0 basis-full items-center gap-2 rounded-full border border-paper bg-paper px-4 py-1.5 shadow-card md:order-3 md:ml-auto md:flex md:w-52 md:basis-auto md:animate-none md:bg-paper/80 md:shadow-sm md:focus-within:bg-paper lg:w-56 xl:w-72`}
      >
        {pending ? (
          <LoaderCircle className="size-4 shrink-0 animate-spin text-muted" />
        ) : (
          <Search className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
        )}
        <label htmlFor="site-search" className="sr-only">
          Search movies
        </label>
        <input ref={inputRef} id="site-search" type="search" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setMobileOpen(false); }} placeholder="Search movies & TV…" autoComplete="off" enterKeyHint="search" className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden" />
        {value && (
          <button type="button" onClick={clear} aria-label="Clear search" className="grid size-6 shrink-0 place-items-center rounded-full text-muted transition hover:bg-ink/5 hover:text-ink">
            <X className="size-3.5" />
          </button>
        )}
      </form>
    </Fragment>
  );
}
