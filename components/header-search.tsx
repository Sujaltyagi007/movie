"use client";
import { LoaderCircle, Search, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function HeaderSearch() {
  const params = useSearchParams();
  return <HeaderSearchField key={params.get("q") ?? ""} initialQuery={params.get("q") ?? ""} />;
}

export function HeaderSearchField({ initialQuery = "" }: { initialQuery?: string }) {
  return (
    <SearchForm initialQuery={initialQuery} inputId="site-search" className="order-3 ml-auto hidden w-52 items-center gap-2 rounded-full border border-paper bg-paper/80 px-4 py-1.5 shadow-sm focus-within:bg-paper md:flex short:flex lg:w-56 xl:w-72" />
  );
}

export function MobileSearch() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  return <MobileSearchField key={q} initialQuery={q} />;
}

export function MobileSearchField({ initialQuery = "" }: { initialQuery?: string }) {
  return (
    <SearchForm initialQuery={initialQuery} inputId="page-search" autoFocus={!initialQuery} className="hidden items-center gap-2 rounded-2xl border border-paper bg-paper px-4 py-2 shadow-card phone:flex" />
  );
}

function SearchForm({ initialQuery, inputId, className, autoFocus = false }: { initialQuery: string; inputId: string; className: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const q = value.trim();
    inputRef.current?.blur();
    startTransition(() => router.push(q ? `/search?${new URLSearchParams({ q })}` : "/search"));
  }

  function clear() {
    setValue("");
    if (initialQuery) startTransition(() => router.push("/search"));
    inputRef.current?.focus();
  }

  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); submit(); }} className={className}>
      {pending ? (
        <LoaderCircle className="size-4 shrink-0 animate-spin text-muted" />
      ) : (
        <Search className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
      )}
      <label htmlFor={inputId} className="sr-only">
        Search movies
      </label>
      <input ref={inputRef} id={inputId} type="search" value={value} onChange={(e) => setValue(e.target.value)} autoFocus={autoFocus} placeholder="Search movies & TV…" autoComplete="off" enterKeyHint="search" className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden" />
      {value && (
        <button type="button" onClick={clear} aria-label="Clear search" className="grid size-6 shrink-0 place-items-center rounded-full text-muted transition hover:bg-ink/5 hover:text-ink touch:size-9">
          <X className="size-3.5" />
        </button>
      )}
    </form>
  );
}
