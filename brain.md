# Reelio (`movie`)

## Overview
Reelio is a Next.js App Router movie and TV discovery application powered by The Movie Database (TMDB), with direct in-app playback of public-domain feature films via the Internet Archive (`archive.org`). Users can browse trending titles, streaming-platform rows, genre tiles, movie/TV catalogs, search multi-media results, watch trailers, and stream public-domain full movies in a responsive HTML5 player.

## Stack and commands
- **Framework**: Next.js `16.4.6` (App Router, `cacheComponents: true`, `partialPrefetching: true`, Turbopack CSS loader)
- **Language**: TypeScript (`^5`, `strict: true`)
- **UI / Styling**: React `19.3.0`, Tailwind CSS `4.3.3` (`@tailwindcss/turbopack`), `lucide-react` `^1.73.0`, `Google_Sans` via `next/font/google`
- **Package manager**: `pnpm@11.1.0`
- **Commands**:
  - `pnpm dev` — start Next.js development server (`next dev`)
  - `pnpm build` — production build (`next build`)
  - `pnpm start` — start production server (`next start`)
  - `pnpm lint` — run ESLint (`eslint`)
  - `pnpm exec tsc --noEmit` — run TypeScript typecheck
  - `node --test lib/archive.test.ts` — run unit tests for `lib/archive.ts`
  - `node --test lib/stream.test.ts` — run unit tests for `lib/stream.ts`
  - `node --test lib/vidsrc-subtitles.test.ts` — run unit tests for `lib/vidsrc-subtitles.ts`

## Directory map
- `app/` — App Router pages, layout, global styles, error and not-found boundaries
  - `app/layout.tsx` — Root shell, Google Sans font, inline pre-paint theme script, `BackgroundLines`, `Rail`, `TopBar`
  - `app/globals.css` — Tailwind v4 import, `@theme inline` tokens, `:root` / `:root.dark` CSS variables, `.panel-surface`, keyframes
  - `app/page.tsx` — Home page (`TrendingBanner`, trending row, platform rows, movie/TV list rows, `GenreBrowse`)
  - `app/movies/page.tsx` — Movies catalog browser (`BrowseView` with `type="movie"`)
  - `app/tv/page.tsx` — TV shows catalog browser (`BrowseView` with `type="tv"`)
  - `app/search/page.tsx` — Multi-search results page (`?q=`, `?page=`)
  - `app/api/stream/[id]/route.ts` — VidSrc embed resolver (`GET` movie, `POST` movie/TV episode + automatic or manual `sub.info` subtitles)
  - `app/api/subtitles/vidsrc/route.ts` — CORS-enabled VidSrc `[{ file, label }]` JSON manifest endpoint
  - `app/api/subtitles/track/route.ts` — CORS-enabled WebVTT track endpoint converting verified OpenSubtitles `.srt`/`.vtt` tracks via `srtToVtt`
  - `app/api/titles/route.ts` — Paginated feed route handler (`/api/titles`)
  - `app/movie/[id]/page.tsx` — Movie detail page (`DetailHero`, `MoviePlayer` when matched on Internet Archive, `Overview`, `WatchProviders`, `CastRow`, `MediaRow`)
  - `app/tv/[id]/page.tsx` — TV show detail page (`DetailHero`, `TvEpisodePlay`, `Overview`, `WatchProviders`, `SeasonsRow`, `CastRow`, `MediaRow`)
  - `app/error.tsx` — Client error boundary for TMDB/network failures
  - `app/not-found.tsx` — Custom 404 page
- `components/` — UI components (server and client)
  - `components/background-lines.tsx` — Decorative fixed SVG line backdrop
  - `components/rail.tsx` — Desktop left icon navigation rail
  - `components/top-bar.tsx` — Top navigation bar, `NavLinks`, `HeaderSearch`, `ThemeToggle`
  - `components/nav-links.tsx` — Desktop/mobile route links (`Home`, `Movies`, `TV Shows`, `Coming Soon`) with active state and `useLinkStatus` pending dot
  - `components/header-search.tsx` — URL-synced `?q=` search form with mobile toggle
  - `components/theme-toggle.tsx` — Light/dark theme switcher with View Transition radial clip-path reveal
  - `components/trending-banner.tsx` — Server wrapper fetching top trending titles + logos/trailers for `BannerCarousel`
  - `components/banner-carousel.tsx` — Client hero carousel with autoplay, progress bar, up-next preview cards, and YouTube `<dialog>` trailer modal
  - `components/browse-filters.tsx` — Client collapsible `Filters` panel and active filter pills for `BrowseView`
  - `components/browse-view.tsx` — Shared catalog filtering/pagination view for `/movies` and `/tv`
  - `components/detail.tsx` — Shared detail page building blocks (`BackLink`, `DetailHero`, `Fact`, `Overview`, `WatchProviders`, `CastRow`, `SeasonsRow`, `DetailSkeleton`)
  - `components/genre-browse.tsx` — Client "Browse by genre" section with Movies/TV toggle, themed genre icons, mood hints, and `"All movies"` / `"All TV shows"` link
  - `components/media-card.tsx` — Poster card linking to `/movie/[id]` or `/tv/[id]`
  - `components/media-grid.tsx` — Responsive grid (`MediaGrid`, `MediaGridSkeleton`)
  - `components/media-row.tsx` — Horizontal scrolling media shelf
  - `components/row-scroller.tsx` — Client horizontal scroll controls for `MediaRow`
  - `components/movie-player.tsx` — Client responsive HTML5 `<video>` player with seek/buffer bar, quality switcher, playback speed, volume/mute, PiP, fullscreen (including iOS `webkitEnterFullscreen`), keyboard shortcuts, and Archive.org fallback UI
  - `components/trailer-button.tsx` — Client YouTube trailer `<dialog>` modal trigger used in `DetailHero`
  - `components/tv-episode-play.tsx` — Client Season/Episode & available-subtitles dropdown selector bound to `VideoPlayButton` on `/tv/[id]`
  - `components/VideoPlayButton.tsx` — Client play trigger posting `{ mediaType, season, episode, sub }` to `/api/stream/[id]`
- `lib/` — Shared data, catalog types, and domain helpers
  - `lib/catalog.ts` — Shared client/server types (`MediaType`, `Media`, `MOVIE_LISTS`, `TV_LISTS`, `LISTS`), `mediaHref`, `releaseYear`, `formatRuntime`, `imageUrl`
  - `lib/stream.ts` — VidSrc embed & list URL builders (`STREAM_MOVIE`, `STREAM_EPISODE`, `STREAM_MOVIE_LIST`, `STREAM_TV_LATEST`, `withSubtitle`)
  - `lib/stream.test.ts` — `node:test` unit tests for `lib/stream.ts`
  - `lib/vidsrc-subtitles.ts` — Multi-language OpenSubtitles v3 (`opensubtitles-v3.strem.io`) lookup, priority sorting (`en`, `hi`, `ta`, `te`, etc.), and public HTTPS origin resolution
  - `lib/vidsrc-subtitles.test.ts` — `node:test` unit tests for `lib/vidsrc-subtitles.ts`
  - `lib/tmdb.ts` — TMDB REST client (`tmdb`), normalization helpers (`toMedia`, `toDetails`), and `"use cache"` data loaders (`getTrending`, `getList`, `discover`, `searchMulti`, `getGenres`, `getGenreNames`, `getProviders`, `getMovie`, `getTv`, `getBannerExtras`)
  - `lib/archive.ts` — Internet Archive public-domain feature-film matcher (`findPublicDomainMovie`, `selectPlayableSources`, `normalizeTitle`, `extractYear`, `parseDurationSeconds`)
  - `lib/archive.test.ts` — `node:test` unit tests for `lib/archive.ts` (mocks `fetch` and `next/cache`)
- `next.config.ts` — Enables `cacheComponents`, `partialPrefetching`, `experimental.agentFeedback`, TMDB remote image patterns
- `eslint.config.mjs` — ESLint 9 flat config with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`

## Modules
- **`lib/catalog.ts`**: Client-safe shared constants and helpers for normalized `Media` items, list definitions (`MOVIE_LISTS`, `TV_LISTS`), URL builders (`mediaHref`, `imageUrl`), and formatting (`releaseYear`, `formatRuntime`).
- **`lib/tmdb.ts`**: Server-only TMDB API v3 client with exponential backoff retry (up to 5 attempts on network errors), `"use cache"` + `cacheLife` directives, and regional streaming provider lookup (`REGION` from `TMDB_REGION`, default `US`).
- **`lib/archive.ts`**: Server-only Internet Archive client that queries `https://archive.org/advancedsearch.php` (`collection:feature_films AND mediatype:movies`) and `https://archive.org/metadata/{identifier}` with a 6s timeout (`AbortSignal.timeout(6000)`), verifies normalized title, release year (`±2` years), non-dark status, and feature-length runtime against TMDB metadata, and returns ranked MP4 stream URLs (`https://archive.org/download/...`). Cached via `"use cache"` (`cacheLife("days")`) only on successful lookups; transient failures log a warning and return `null` without caching.
- **`components/movie-player.tsx`**: Responsive `aspect-video` client `<video>` player with adaptive controls (`sm:` breakpoints, touch + hover auto-hide), quality selection across multiple MP4 derivatives, playback speed (`0.75x`–`2x`), PiP, fullscreen, keyboard shortcuts (`Space`/`k`, `j`/`l`/arrows, `m`, `f`), automatic fallback across sources on decode/network errors, and direct Archive.org link on failure.
- **`app/movie/[id]/page.tsx`**: Movie detail route using `components/detail.tsx` (`DetailHero`, `Overview`, `WatchProviders`, `CastRow`) + `MediaRow`, enriched with `findPublicDomainMovie` and `<MoviePlayer />` when a verified public-domain stream is available.

## Data flow
1. Requests to `/`, `/movies`, `/tv`, and `/search` load normalized `Media` lists from `lib/tmdb.ts` with `"use cache"` and render `MediaRow` / `MediaGrid`.
2. Navigating to `/movie/[id]` loads `getMovie(id)` from TMDB and `findPublicDomainMovie({ title, releaseDate: movie.date, runtimeMinutes: movie.runtime })` from Internet Archive.
3. If `findPublicDomainMovie` finds a verified public-domain MP4 match, `app/movie/[id]/page.tsx` renders a `Free · Public Domain` badge, a `"Watch full movie"` hero action (`#watch`), and `<MoviePlayer />` streaming directly from `archive.org/download/...`; otherwise it displays the standard trailer action and `WatchProviders`.

## Data model
- `Media` (`lib/catalog.ts`): `{ id, mediaType, title, overview, posterPath, backdropPath, rating, date, genreIds }`
- `Details` / `MovieDetails` / `TvDetails` (`lib/tmdb.ts`): Normalized detail shapes including `genres`, `cast`, `trailerKey`, `related`, `watch` (`WatchOptions | null`), plus `runtime` for movies and `imdbId` / `seasons` / `networks` / `creators` for TV
- `ArchiveVideoSource` (`lib/archive.ts`): `{ url, label, width, height, sizeBytes }`
- `PublicDomainMovie` (`lib/archive.ts`): `{ identifier, title, year, archiveUrl, durationSeconds, sources }`

## API contracts
- `GET /api/stream/[id]`: Resolves `{ videoUrl }` for a movie ID (`STREAM_MOVIE`).
- `POST /api/stream/[id]`: Resolves `{ videoUrl }` from JSON body `{ mediaType, imdbId, season, episode, sub }` and auto-attaches `?sub.info=` when a public HTTPS origin and IMDb subtitles exist.
- `GET /api/subtitles/vidsrc`: Returns CORS-enabled VidSrc subtitle JSON `[{ file, label }]` for `?id=tt...&season=...&episode=...&lang=...`.
- `POST /api/subtitles/vidsrc`: Returns `{ tracks: [{ langCode, label }] }` from JSON `{ imdbId, season, episode }` for UI subtitle dropdowns without URL query parameters.
- `GET /api/subtitles/track`: Returns CORS-enabled WebVTT (`text/vtt`) for `?id=tt...&track=...&season=...&episode=...`.
- `GET /api/titles`: Paginated browse/search feed endpoint backed by `lib/feed.ts`.
- Routes: `/`, `/movies?list=&genre=&provider=&page=`, `/tv?list=&genre=&provider=&page=`, `/search?q=&page=`, `/movie/[id]`, `/tv/[id]`.

## External services and env vars
- **TMDB API v3** (`https://api.tmdb.org/3`) & **TMDB Images** (`https://image.tmdb.org/t/p`)
- **Internet Archive** (`https://archive.org/advancedsearch.php`, `/metadata/{identifier}`, `/download/{identifier}/...`) — no API key required
- **OpenSubtitles v3 Stremio Addon** (`https://opensubtitles-v3.strem.io/subtitles/...`) — keyless public HTTPS subtitle lookup for VidSrc `sub.info`
- **YouTube** (`https://www.youtube.com/watch?v=...`, `https://www.youtube.com/embed/...`) for trailer playback
- **Environment variables** (`.env`, server-side only except `NEXT_PUBLIC_SITE_URL`):
  - `TMDB_READ_ACCESS` — TMDB v4 Read Access Token (preferred Bearer auth)
  - `TMDB_API_KEY` — TMDB v3 API key (fallback query param auth)
  - `TMDB_REGION` — Optional ISO-3166-1 country code for watch providers and regional lists (defaults to `US`)
  - `NEXT_PUBLIC_SITE_URL` — Optional public HTTPS origin (required when testing VidSrc `sub.info` from `localhost`, so VidSrc can reach `/api/subtitles/vidsrc`)

## Conventions
- Next.js 16 `cacheComponents: true` + `partialPrefetching: true`: components reading `useSearchParams` or dynamic `searchParams`/`params` are wrapped in `<Suspense>`.
- Data functions use `"use cache"` paired with `cacheLife("hours" | "days" | "weeks")`.
- Strict TypeScript (`strict: true`), `@/*` path alias, Tailwind v4 CSS theme variables in `app/globals.css`.
- Client feature detection (e.g. `pictureInPictureEnabled`, `matchMedia`) uses `useSyncExternalStore` rather than `setState` inside `useEffect`.

## Decisions
- **2026-11-17**: Initialized `brain.md` from existing codebase.
- **2026-11-18**: Integrated Internet Archive (`archive.org`) public-domain movie lookup and a responsive HTML5 `<MoviePlayer />` on `/movie/[id]`, keeping caching inside `fetchArchiveMatchCached` so transient network failures return `null` without caching errors, and enforcing title + year (`±2`) + runtime checks so modern remakes and trailers are rejected.
- **2026-11-19**: Redesigned the home page "Browse by genre" section into `components/genre-browse.tsx` using Reelio's `bg-paper` surface tokens, distinct genre icons, mood hints, a Movies/TV Shows toggle, and a `2 -> 3 -> 4 -> 5` column responsive grid.
- **2026-11-20**: Extended `lib/stream.ts` with movie, TV episode (`STREAM_EPISODE`), VidSrc list (`STREAM_MOVIE_LIST`, `STREAM_TV_LATEST`), and subtitle (`withSubtitle` / `?sub.info=`) URL builders; updated `/api/stream/[id]` (`POST` JSON payload keeping episode/subtitle parameters out of URLs), `getTv` (`imdbId` via `external_ids`), and `/tv/[id]` (`TvEpisodePlay`).
- **2026-11-20**: Added automatic multi-language VidSrc `sub.info` support (`lib/vidsrc-subtitles.ts`, `/api/subtitles/vidsrc`, `/api/subtitles/track`) backed by keyless `opensubtitles-v3.strem.io` and normalized to CORS-enabled WebVTT (`en`, `hi`, `ta`, `te`, etc.).

## Known gaps
- No test runner script is configured in `package.json`; `lib/archive.test.ts` and `lib/stream.test.ts` run directly via `node --test`.
- `findPublicDomainMovie` relies on Internet Archive metadata matching (`collection:feature_films`); if an archive item lacks year metadata or uses a substantially different title, it will not match.

## Last verified
- **Date**: 2026-11-20
- **Commit**: `281d6af` (plus VidSrc TV episode & subtitle stream bindings)
