import Link from "next/link";
import { CalendarClock, Film, House, Search, Tv, type LucideIcon } from "lucide-react";
import type { DestinationKey } from "@/components/nav-links";

/** `shortLabel`: used where space is tight (phone tab bar); `label` stays the accessible name. */
type Destination = { key: DestinationKey; href: string; label: string; shortLabel?: string; icon: LucideIcon; primary?: boolean };

/** App sections, shared by the desktop rail and the phone bottom tab bar. */
export const DESTINATIONS: Destination[] = [
  { key: "home", href: "/", label: "Home", icon: House, primary: true },
  { key: "search", href: "/search", label: "Search", icon: Search },
  { key: "movies", href: "/movies", label: "Movies", icon: Film },
  { key: "tv", href: "/tv", label: "TV Shows", icon: Tv },
  { key: "upcoming", href: "/movies?list=upcoming", label: "Coming soon", shortLabel: "Upcoming", icon: CalendarClock },
];

export function Rail() {
  return (
    <nav aria-label="Primary" className="hidden w-12 shrink-0 md:block [@media(max-height:520px)]:hidden">
      <div className="sticky top-8 flex h-[calc(100dvh-5.5rem)] min-h-max flex-col items-center justify-between gap-4 py-3">
        <ul className="flex flex-col items-center gap-2.5">
          {DESTINATIONS.map(({ href, label, icon: Icon, primary }) => (
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
