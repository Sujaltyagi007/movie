import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Rail } from "@/components/rail";
import { TopBar } from "@/components/top-bar";
import { Google_Sans } from "next/font/google";
import { Suspense } from "react";
import { THEME_COLORS } from "@/lib/theme";
import { BackgroundLines } from "@/components/background-lines";
import { BottomTabBar, BottomTabBarView } from "@/components/bottom-tab-bar";

const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"], adjustFontFallback: false,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "Reelio — Find your next favorite film", template: "%s · Reelio" },
  description: "Discover trending, top rated and upcoming movies, powered by TMDB.",
  applicationName: "Reelio",
  // Home-screen launch on iOS opens full screen; "default" keeps dark status-bar text readable
  // over the light theme (the bar takes the theme-color below).
  appleWebApp: { capable: true, title: "Reelio", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Initial browser-bar color from the system theme; ThemeToggle keeps it in sync with the
  // in-app light/dark choice.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
};

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${googleSans.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <BackgroundLines />
        <div className="relative mx-auto flex min-h-dvh max-w-360 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
          <div className="flex w-full gap-3 sm:rounded-[36px] sm:border sm:border-paper/60 sm:bg-paper/35 sm:p-3 sm:backdrop-blur-xl short:p-2">
            <Rail />
            <div className="panel-surface relative flex min-w-0 flex-1 flex-col overflow-clip sm:rounded-[30px] sm:shadow-panel">
              <TopBar />
              <main className="flex flex-1 flex-col px-4 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))] sm:px-8 short:px-6">{children}</main>
              {/* Keeps the end of the page clear of the fixed bottom tab bar on phones. */}
              <div aria-hidden className="hidden h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0 phone:block" />
            </div>
          </div>
        </div>
        <Suspense fallback={<BottomTabBarView />}>
          <BottomTabBar />
        </Suspense>
      </body>
    </html>
  );
}
