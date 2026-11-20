import Link from "next/link";
import { Suspense } from "react";
import { Clapperboard } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavLinkList, NavLinks } from "@/components/nav-links";
import { HeaderSearch, HeaderSearchField } from "@/components/header-search";

export function TopBar() {
  return (
    // Top padding respects the status bar when the site is opened from the iPhone home screen.
    <header className="relative z-30 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pt-[max(1.5rem,env(safe-area-inset-top))] xl:px-12 short:px-6 short:pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-3 sm:gap-4 xl:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Reelio home">
          <span className="grid size-9 place-items-center rounded-xl bg-ink text-paper shadow-md">
            <Clapperboard className="size-4.5" strokeWidth={2} />
          </span>
          <span className="text-xl font-semibold tracking-tight text-ink">Reelio</span>
        </Link>

        <nav aria-label="Main" className="ml-2 hidden shrink-0 items-center gap-1 rounded-full bg-paper/40 p-1 ring-1 ring-paper/70 lg:flex xl:ml-6 short:sm:flex">
          <Suspense fallback={<NavLinkList variant="desktop" />}>
            <NavLinks variant="desktop" />
          </Suspense>
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <Suspense fallback={<HeaderSearchField />}>
            <HeaderSearch />
          </Suspense>
          <ThemeToggle />
        </div>
      </div>

      <nav aria-label="Main" className="no-scrollbar -mx-1 mt-4 flex gap-5 overflow-x-auto px-1 pr-8 mask-[linear-gradient(to_right,black_85%,transparent)] md:gap-7 md:mask-none lg:hidden touch:mt-1 short:sm:hidden">
        <Suspense fallback={<NavLinkList variant="mobile" />}>
          <NavLinks variant="mobile" />
        </Suspense>
      </nav>
    </header>
  );
}
