import Link from "next/link";
import { Clapperboard } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-md flex-1 place-items-center py-24 text-center">
      <div>
        <Clapperboard className="mx-auto size-10 text-muted" strokeWidth={1.5} />
        <h1 className="mt-4 text-2xl font-medium tracking-tight">This reel is missing</h1>
        <p className="mt-2 text-muted">We couldn&apos;t find the page or movie you were looking for.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper shadow-md transition hover:bg-ink-soft">Back to discover</Link>
      </div>
    </div>
  );
}
