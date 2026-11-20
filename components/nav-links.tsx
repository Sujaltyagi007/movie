"use client";
import { Fragment } from "react/jsx-runtime";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/", label: "Home", key: "home" },
  { href: "/movies", label: "Movies", key: "movies" },
  { href: "/tv", label: "TV Shows", key: "tv" },
  { href: "/movies?list=upcoming", label: "Coming Soon", key: "upcoming" },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]["key"];

function activeKeyFor(pathname: string, list: string | null): NavKey | undefined {
  if (pathname === "/") return "home";
  if (pathname === "/movies") return list === "upcoming" ? "upcoming" : "movies";
  if (pathname.startsWith("/movie/")) return "movies";
  if (pathname === "/tv" || pathname.startsWith("/tv/")) return "tv";
  return undefined;
}

type Variant = "desktop" | "mobile";

const STYLES: Record<Variant, { base: string; active: string; idle: string }> = {
  desktop: {
    base: "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition touch:py-2.5 short:px-3",
    active: "bg-paper text-ink shadow-sm",
    idle: "text-ink/55 hover:bg-paper/60 hover:text-ink",
  },
  mobile: {
    base: "shrink-0 whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition touch:py-3",
    active: "border-ink text-ink",
    idle: "border-transparent text-ink/55",
  },
};

export function NavLinks({ variant }: { variant: Variant }) {
  const pathname = usePathname();
  const params = useSearchParams();
  return <NavLinkList variant={variant} activeKey={activeKeyFor(pathname, params.get("list"))} />;
}

function PendingDot() {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden className={`absolute right-1 top-1 size-1.5 rounded-full bg-accent transition-opacity ${pending ? "animate-pulse opacity-100" : "opacity-0"}`} />
  );
}
export function NavLinkList({ variant, activeKey }: { variant: Variant; activeKey?: NavKey }) {
  const s = STYLES[variant];
  return (
    <Fragment>
      {NAV_ITEMS.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined} className={`relative ${s.base} ${active ? s.active : s.idle}`} >
            {item.label}
            <PendingDot />
          </Link>
        );
      })}
    </Fragment>
  );
}
