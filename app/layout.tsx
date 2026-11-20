import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Rail } from "@/components/rail";
import { TopBar } from "@/components/top-bar";
import { Google_Sans } from "next/font/google";
import { BackgroundLines } from "@/components/background-lines";

const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"], adjustFontFallback: false,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "Reelio — Find your next favorite film", template: "%s · Reelio" },
  description: "Discover trending, top rated and upcoming movies, powered by TMDB.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
            <div className="panel-surface relative flex min-w-0 flex-1 flex-col overflow-hidden sm:rounded-[30px] sm:shadow-panel">
              <TopBar />
              <main className="flex flex-1 flex-col px-4 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))] sm:px-8 short:px-6">{children}</main>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
