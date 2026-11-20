import Link from "next/link";
import { CalendarClock, Film, House, Search, Tv, type LucideIcon } from "lucide-react";

type RailItem = { href: string; label: string; icon: LucideIcon; primary?: boolean };

const ITEMS: RailItem[] = [
  { href: "/", label: "Home", icon: House, primary: true },
  { href: "/search", label: "Search", icon: Search },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/tv", label: "TV Shows", icon: Tv },
  { href: "/movies?list=upcoming", label: "Coming soon", icon: CalendarClock },
];

export function Rail() {
  return (
    <nav aria-label="Primary" className="hidden w-12 shrink-0 md:block [@media(max-height:520px)]:hidden">
      <div className="sticky top-8 flex h-[calc(100dvh-5.5rem)] min-h-max flex-col items-center justify-between gap-4 py-3">
        <ul className="flex flex-col items-center gap-2.5">
          {ITEMS.map(({ href, label, icon: Icon, primary }) => (
            <li key={label} className="group relative">
              <Link href={href} aria-label={label} className={primary ? "grid size-10 place-items-center rounded-full bg-ink text-paper shadow-md transition hover:bg-ink-soft" : "grid size-10 place-items-center rounded-full border border-paper bg-paper/80 text-ink/70 shadow-sm transition hover:bg-paper hover:text-ink"}>
                <Icon className="size-4.5" strokeWidth={1.75} />
              </Link>
              <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs text-paper opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:opacity-100">
                {label}
              </span>
            </li>
          ))}
        </ul>

        <Link href="/" aria-label="Reelio home" className="grid size-10 place-items-center rounded-full bg-ink text-lg font-bold italic tracking-tighter text-paper shadow-md">
          R
        </Link>
      </div>
    </nav>
  );
}
