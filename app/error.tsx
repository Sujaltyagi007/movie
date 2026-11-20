"use client";
import { useEffect } from "react";
import { CloudOff } from "lucide-react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => { console.error(error) }, [error]);
  return (
    <div className="mx-auto grid max-w-md flex-1 place-items-center py-24 text-center">
      <div>
        <CloudOff className="mx-auto size-10 text-muted" strokeWidth={1.5} />
        <h1 className="mt-4 text-2xl font-medium tracking-tight">Couldn&apos;t reach the movie database</h1>
        <p className="mt-2 text-muted">TMDB didn&apos;t respond as expected. Check your connection and try again.</p>
        <button type="button" onClick={retry} className="mt-6 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper shadow-md transition hover:bg-ink-soft">
          Try again
        </button>
      </div>
    </div>
  );
}
