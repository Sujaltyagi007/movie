"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DESTINATIONS } from "@/components/rail";
import { activeNavKey, PendingDot, type DestinationKey } from "@/components/nav-links";

/**
 * Phone navigation: a fixed bottom tab bar like a native app. Shown on portrait phones (the
 * `phone` variant in app/globals.css); tablets, desktops and landscape phones keep the top
 * navigation. Rendered outside the blurred app frame in app/layout.tsx so `position: fixed`
 * stays relative to the screen.
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const params = useSearchParams();
  return <BottomTabBarView activeKey={activeNavKey(pathname, params.get("list"))} />;
}

export function BottomTabBarView({ activeKey }: { activeKey?: DestinationKey }) {
  return (
    <nav aria-label="Primary" data-tab-bar className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/8 bg-paper/85 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] shadow-[0_-8px_24px_-16px_rgb(0_0_0/0.35)] backdrop-blur-xl backdrop-saturate-150 hidden phone:block">
      <ul className="grid h-16 grid-cols-5">
        {DESTINATIONS.map(({ key, href, label, shortLabel, icon: Icon }) => {
          const active = key === activeKey;
          return (
            <li key={key} className="min-w-0">
              <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className={`group relative flex h-full select-none flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:scale-95 ${active ? "text-ink" : "text-muted"}`}>
                <span className={`grid h-7 w-14 place-items-center rounded-full transition-colors ${active ? "bg-accent/15 text-accent" : "group-active:bg-ink/5"}`}>
                  <Icon className="size-5" strokeWidth={active ? 2.1 : 1.75} />
                </span>
                <span aria-hidden className="max-w-full truncate px-1">{shortLabel ?? label}</span>
                <PendingDot />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
