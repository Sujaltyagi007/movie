# Reelio (`movie`)

## Overview
Reelio is a Next.js App Router movie and TV discovery application powered by The Movie Database (TMDB), with direct in-app playback of public-domain feature films via the Internet Archive (`archive.org`). Users can browse trending titles, streaming-platform rows, genre tiles, movie/TV catalogs, search multi-media results, watch trailers, and stream public-domain full movies in a responsive HTML5 player.

## Stack and commands
- **Framework**: Next.js `16.4.6` (App Router, `cacheComponents: true`, `partialPrefetching: true`, Turbopack CSS loader)
- **Language**: TypeScript (`^5`, `strict: true`)
- **UI / Styling**: React `19.3.0`, Tailwind CSS `4.3.3` (`@tailwindcss/turbopack`), `lucide-react` `^1.73.0`, `hls.js` `^1.7.4`, `Google_Sans` via `next/font/google`
- **Package manager**: `pnpm@11.1.0`
- **Commands**:
  - `pnpm dev` — start Next.js development server (`next dev`)
  - `pnpm build` — production build (`next build`)
  - `pnpm start` — start production server (`next start`)
  - `pnpm lint` — run ESLint (`eslint`)
  - `pnpm exec tsc --noEmit` — run TypeScript typecheck

## Directory map
- `app/` — App Router pages, layout, global styles, error and not-found boundaries
  - `app/layout.tsx` — Root shell, Google Sans font, inline pre-paint theme script, `BackgroundLines`, `Rail`, `TopBar`, phone `BottomTabBar` (outside the blurred frame) + bottom spacer, `viewport.themeColor` (light/dark), `appleWebApp` metadata; the app panel uses `overflow-clip` so the phone header can be sticky
  - `app/manifest.ts` — Web app manifest (`/manifest.webmanifest`): standalone display, theme/splash colors from `lib/theme.ts`, icons `/icon/192`, `/icon/512`, `/icon/maskable`, shortcuts to Search/Movies/TV
  - `app/icon.tsx` / `app/apple-icon.tsx` — Code-generated PNG app icons (`generateImageMetadata` ids `192`, `512`, `maskable`; 180px Apple icon) drawn by `lib/app-icon.tsx`
  - `app/globals.css` — Tailwind v4 import, `@theme inline` tokens, `:root` / `:root.dark` CSS variables, `.panel-surface`, keyframes
  - `app/page.tsx` — Home page (`TrendingBanner`, trending row, platform rows, movie/TV list rows, `GenreBrowse`)
  - `app/movies/page.tsx` — Movies catalog browser (`BrowseView` with `type="movie"`)
  - `app/tv/page.tsx` — TV shows catalog browser (`BrowseView` with `type="tv"`)
  - `app/search/page.tsx` — Multi-search results page (`?q=`, `?page=`)
  - `app/api/audio/[type]/[id]/route.ts` — Audio rendition parser endpoint (`GET` parsing `#EXT-X-MEDIA:TYPE=AUDIO` from live master playlist with `/api/hls?u=` URIs)
  - `app/api/hls/route.ts` — HLS proxy (`GET /api/hls?u=`) with HTTPS/private-IP SSRF guard, per-invocation `mint()` token injection, `.m3u8` rewriting, and binary segment passthrough
  - `app/api/stream/[id]/route.ts` — VidSrc embed resolver (`GET` movie, `POST` movie/TV episode + automatic or manual `sub.info` subtitles)
  - `app/api/streams/[type]/[id]/route.ts` — Resolved HLS manifest endpoint (`GET` movie/TV with `?season=&episode=`), 10m post-probe cache, `audioScore`-sorted top-4 `#EXTM3U` probes, `deadSources`, `/api/hls?u=` `sources`/`servers`, and `tracks`
  - `app/api/sub/[id]/route.ts` — Multi-language OpenSubtitles v3 endpoint (`GET ?langs=eng,spa`, up to 3 tracks/lang, `.vtt` via `/api/subtitles/track`)
  - `app/api/subtitles/vidsrc/route.ts` — CORS-enabled VidSrc `[{ file, label }]` JSON manifest endpoint
  - `app/api/subtitles/track/route.ts` — CORS-enabled WebVTT track endpoint converting verified OpenSubtitles `.srt`/`.vtt` tracks via `srtToVtt`
  - `app/api/titles/route.ts` — Paginated feed route handler (`/api/titles`)
  - `app/movie/[id]/page.tsx` — Movie detail page (`DetailHero`, `Overview`, `WatchProviders`, `CastRow`, `MediaRow`), with the Internet Archive match streamed in separately (`PublicDomainBadge`, `MovieActions`, `PublicDomainWatch` + `MoviePlayer`)
  - `app/tv/[id]/page.tsx` — TV show detail page (`DetailHero`, `TvEpisodePlay`, `Overview`, `WatchProviders`, `SeasonsRow`, `CastRow`, `MediaRow`)
  - Both detail pages export `generateStaticParams` (`getPrerenderIds(type, 30)`): trending + popular IDs are prerendered at build; other IDs serve the App Shell first and are cached after their first visit (ISR with Cache Components + Partial Prefetching)
  - `app/error.tsx` — Client error boundary for TMDB/network failures
  - `app/not-found.tsx` — Custom 404 page
- `components/` — UI components (server and client)
  - `components/background-lines.tsx` — Decorative fixed SVG line backdrop
  - `components/rail.tsx` — Desktop left icon navigation rail; exports `DESTINATIONS` (Home, Search, Movies, TV Shows, Coming soon; optional `shortLabel` for the tab bar) shared with `BottomTabBar`
  - `components/bottom-tab-bar.tsx` — Client fixed bottom tab bar for portrait phones (`phone` variant), safe-area aware, hidden while a player/dialog is open
  - `components/top-bar.tsx` — Top navigation bar, `NavLinks`, `HeaderSearch`, `ThemeToggle`; on portrait phones a compact sticky translucent header (logo + theme toggle) with the text nav row hidden
  - `components/nav-links.tsx` — Desktop/mobile route links (`Home`, `Movies`, `TV Shows`, `Coming Soon`) with active state and `useLinkStatus` pending dot; exports `activeNavKey`, `DestinationKey`, `PendingDot`
  - `components/header-search.tsx` — URL-synced `?q=` search: `HeaderSearch` (tablet/desktop/landscape header box) and `MobileSearch` (full-width field at the top of `/search` on portrait phones)
  - `components/theme-toggle.tsx` — Light/dark theme switcher with View Transition radial clip-path reveal; keeps `<meta name="theme-color">` in sync with the in-app theme
  - `components/trending-banner.tsx` — Server wrapper fetching top trending titles + logos/trailers for `BannerCarousel`
  - `components/banner-carousel.tsx` — Client hero carousel with autoplay, progress bar, up-next preview cards, and YouTube `<dialog>` trailer modal
  - `components/browse-filters.tsx` — Client collapsible `Filters` panel and active filter pills for `BrowseView`
  - `components/browse-view.tsx` — Shared catalog filtering/pagination view for `/movies` and `/tv`
  - `components/detail.tsx` — Shared detail page building blocks (`BackLink`, `DetailHero`, `HeroActions` (hero button row; full-width stacked on phones), `DetailActions`, `Fact`, `Overview`, `WatchProviders`, `CastRow`, `SeasonsRow`, `DetailSkeleton`); imports player features through `features/player`
  - `components/genre-browse.tsx` — Client "Browse by genre" section with Movies/TV toggle, themed genre icons, mood hints, and `"All movies"` / `"All TV shows"` link
  - `components/media-card.tsx` — Poster card linking to `/movie/[id]` or `/tv/[id]`
  - `components/media-grid.tsx` — Responsive grid (`MediaGrid`, `MediaGridSkeleton`)
  - `components/infinite-media-grid.tsx` — Client infinite-scroll grid loading next pages from `/api/titles`; merges deferred `initialProviders` (search) into the first page's cards
  - `components/media-row.tsx` — Horizontal scrolling media shelf
  - `components/row-scroller.tsx` — Client horizontal scroll controls for `MediaRow`
- `features/player/` — Playback feature boundary; route consumers import its public API from `features/player/index.ts`
  - `features/player/components/movie-player.tsx` — Client HTML5 `<video>` player for MP4/HLS, source/audio/subtitle selection, seeking, speed, volume, PiP, fullscreen, and keyboard shortcuts
  - `features/player/components/movie-player-controls.tsx` and `movie-player-status.tsx` — Isolated controls/header and playback status/error UI
  - `features/player/components/hero-player.tsx` — Client `HeroStage` context host for iframe embeds and direct player playback
  - `features/player/components/movie-player-lazy.tsx` — Lazy-loaded player and preload entry point
  - `features/player/components/video-play-button.tsx` — Playback trigger wired to hosted HLS with embed fallback
  - `features/player/components/trailer-button.tsx` and `tv-episode-play.tsx` — Trailer and TV episode playback controls
  - `features/player/hooks/use-streams.ts` — Client hook and `fetchAvailableStreams` helper for `/api/streams/[type]/[id]`
  - `features/player/hooks/use-hls.ts` — Lazy `hls.js` attachment, recovery, quality levels, and multi-audio selection
- `lib/` — Shared data, catalog types, and domain helpers
  - `lib/catalog.ts` — Shared client/server types (`MediaType`, `Media`, `ProviderMap`, `MOVIE_LISTS`, `TV_LISTS`, `LISTS`), `mediaHref`, `mediaKey`, `releaseYear`, `formatRuntime`, `imageUrl`
  - `lib/hls-token.ts` — Server-side AES-256-GCM sealing/unsealing (`sealHlsTarget`, `unsealHlsTarget`) for opaque `/api/hls?u=` tokens
  - `lib/feed.ts` — Paginated feeds for browse/search (`browseFeed`, `searchFeed`, `feedQuery`, `parseFeedQuery`, `getFeedPage`, `getSearchFirstPage`), shared by the pages and `/api/titles`
  - `lib/resolver.ts` — Typed upstream stream resolver (`resolveRaw`, `resolveDetails`, `mint`, `invalidateMintedToken`, `resolve`) with `\u0026` config unescaping, TV `streamBase` support, 2-attempt two-hop `playerConfig`, `mintContextCache`/`mintedTokenCache`, WASM caching, host deduplication, and 10s `mint` timeout
  - `lib/stream.ts` — VidSrc embed & list URL builders (`STREAM_MOVIE`, `STREAM_EPISODE`, `STREAM_MOVIE_LIST`, `STREAM_TV_LATEST`, `withSubtitle`)
  - `lib/stream-sources.ts` — Pure URL validation, `/api/hls` + `.m3u8` detection, `audioScore`, `rankStreamSources`, `probeHlsSource`, and `parseAudioRenditions`
  - `lib/streams-resolver.ts` — 10-min `Map` cache, `resolveRaw` → `MEDIA_API_URL` fallback, top-4 `#EXTM3U` probe (`deadSources`), TMDB metadata, and audio rendition loader
  - `lib/subtitles-lookup.ts` — Bidirectional ISO 639-1/2 normalization and multi-language OpenSubtitles v3 lookup (up to 3 tracks/lang via `/api/subtitles/track`)
  - `lib/vidsrc-subtitles.ts` — Multi-language OpenSubtitles v3 (`opensubtitles-v3.strem.io`) lookup, priority sorting (`en`, `hi`, `ta`, `te`, etc.), and public HTTPS origin resolution
  - `lib/tmdb.ts` — TMDB REST client (`tmdb`), normalization helpers (`toMedia`, `toDetails`), and `"use cache"` data loaders (`getTrending`, `getList`, `discover`, `searchMulti`, `getGenres`, `getGenreNames`, `getProviders`, `getMovie`, `getTv`, `getBannerExtras`), plus `getPrerenderIds` / `PLACEHOLDER_ID` for detail-page `generateStaticParams`
  - `lib/theme.ts` — `THEME_COLORS` (browser/status bar, match `--panel-top`) and `SPLASH_BACKGROUND`, shared by the layout, manifest and `ThemeToggle`
  - `lib/app-icon.tsx` — `renderAppIcon` (`next/og` `ImageResponse`): lucide clapperboard on the dark gradient
  - `lib/archive.ts` — Internet Archive public-domain feature-film matcher (`findPublicDomainMovie`, `selectPlayableSources`, `normalizeTitle`, `extractYear`, `parseDurationSeconds`)
- `next.config.ts` — Enables `cacheComponents`, `partialPrefetching`, `experimental.agentFeedback`, TMDB remote image patterns, image `qualities: [75, 90]`, and a 31-day `images.minimumCacheTTL`
- `eslint.config.mjs` — ESLint 9 flat config with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`

## Modules
- **`lib/catalog.ts`**: Client-safe shared constants and helpers for normalized `Media` items, list definitions (`MOVIE_LISTS`, `TV_LISTS`), URL builders (`mediaHref`, `imageUrl`), and formatting (`releaseYear`, `formatRuntime`).
- **`lib/tmdb.ts`**: Server-only TMDB API v3 client with exponential backoff retry (up to 5 attempts on network errors), `"use cache"` + `cacheLife` directives, and regional streaming provider lookup (`REGION` from `TMDB_REGION`, default `US`).
- **`lib/archive.ts`**: Server-only Internet Archive client that queries `https://archive.org/advancedsearch.php` (`collection:feature_films AND mediatype:movies`) and `https://archive.org/metadata/{identifier}` with a 6s timeout (`AbortSignal.timeout(6000)`), verifies normalized title, release year (`±2` years), non-dark status, and feature-length runtime against TMDB metadata, and returns ranked MP4 stream URLs (`https://archive.org/download/...`). Up to `MAX_CANDIDATE_LOOKUPS` candidates' metadata are fetched in parallel and evaluated in search-rank order (first match wins). Cached via `"use cache"` (`cacheLife("days")`) only on successful lookups; transient failures log a warning and return `null` without caching.
- **`features/player/components/movie-player.tsx`**: Responsive `aspect-video` client `<video>` player with adaptive controls (`sm:` breakpoints, touch + hover auto-hide), quality selection across multiple MP4 derivatives, playback speed, PiP, fullscreen, keyboard shortcuts (`Space`/`k`, `j`/`l`/arrows, `m`, `f`), automatic fallback across sources on decode/network errors, and direct Archive.org link on failure.
- **`app/movie/[id]/page.tsx`**: Movie detail route using `components/detail.tsx` (`DetailHero`, `Overview`, `WatchProviders`, `CastRow`) + `MediaRow`, enriched with `findPublicDomainMovie` and `<MoviePlayer />` when a verified public-domain stream is available. The lookup is started but not awaited, so the hero and the rest of the page render first.

## Data flow
1. Requests to `/`, `/movies`, `/tv`, and `/search` load normalized `Media` lists from `lib/tmdb.ts` with `"use cache"` and render `MediaRow` / `MediaGrid`. On `/search` without a platform filter, `getSearchFirstPage` returns results immediately and the per-title streaming services as a separate promise, which `InfiniteMediaGrid` merges into the cards after hydration; with a platform filter (and on `/api/titles`) providers stay on the items as before.
2. Navigating to `/movie/[id]` awaits `getMovie(id)` from TMDB, then starts `findPublicDomainMovie({ title, releaseDate: movie.date, runtimeMinutes: movie.runtime })` without awaiting it; three `<Suspense>` boundaries (badge, hero actions with `DetailActions` as fallback, `#watch` section) await the shared promise.
3. If `findPublicDomainMovie` finds a verified public-domain MP4 match, `app/movie/[id]/page.tsx` renders a `Free · Public Domain` badge, a `"Watch full movie"` hero action (`#watch`), and `<MoviePlayer />` streaming directly from `archive.org/download/...`; otherwise it displays the standard trailer action and `WatchProviders`.

## Data model
- `Media` (`lib/catalog.ts`): `{ id, mediaType, title, overview, posterPath, backdropPath, rating, date, genreIds }`
- `Details` / `MovieDetails` / `TvDetails` (`lib/tmdb.ts`): Normalized detail shapes including `genres`, `cast`, `trailerKey`, `related`, `watch` (`WatchOptions | null`), plus `runtime` for movies and `imdbId` / `seasons` / `networks` / `creators` for TV
- `ArchiveVideoSource` (`lib/archive.ts`): `{ url, label, width, height, sizeBytes }`
- `PublicDomainMovie` (`lib/archive.ts`): `{ identifier, title, year, archiveUrl, durationSeconds, sources }`

## API contracts
- `GET /api/audio/[type]/[id]`: Parses `#EXT-X-MEDIA:TYPE=AUDIO` renditions from the first live master playlist and returns `{ tracks: [{ lang, name, group, isDefault, uri }] }` with `uri` rewritten through `/api/hls?u=...` (`200 { tracks: [] }` when single-audio or unavailable).
- `GET /api/hls?u=<sealed>`: Accepts only server-sealed AES-256-GCM `/api/hls?u=` tokens (`unsealHlsTarget`), validates `https:` non-private targets, mints a per-origin token via `mint()`, rewrites `#EXTM3U` URIs into sealed `/api/hls?u=` tokens without `token=`, and streams non-playlist segments as binary `ReadableStream`.
- `GET /api/stream/[id]`: Resolves `{ videoUrl }` for a movie ID (`STREAM_MOVIE`).
- `POST /api/stream/[id]`: Resolves `{ videoUrl }` from JSON body `{ mediaType, imdbId, season, episode, sub }` and auto-attaches `?sub.info=` when a public HTTPS origin and IMDb subtitles exist.
- `GET /api/streams/[type]/[id]`: Resolves `movie` or `tv` (with `?season=&episode=`) via `resolveRaw` first and `MEDIA_API_URL` fallback, caches post-probe raw results for 10 min in memory, probes top 4 for `200 + #EXTM3U` (`deadSources[]`), redacts upstream CDN hostnames (`Server 1`, etc.) and `file_name` (`null`), and returns `{ success, fallback, available, video_url, error, configured, title, imdb_id, file_name, poster, sources, servers, tracks, deadSources }` with sealed `/api/hls?u=...` URLs (`servers` aliases `sources`).
- `GET /api/sub/[id]?langs=eng,spa`: Returns `{ id, langs, tracks: [{ id, language, label, url }] }` (up to 3 tracks per language, normalized ISO 639-2/1, with `url` pointing to `/api/subtitles/track`).
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
- **Environment variables** (`.env`, gitignored; all read server-side only). Active in `.env`: `TMDB_READ_ACCESS`, `MEDIA_API_URL`; the rest are listed there commented out with their defaults:
  - `TMDB_READ_ACCESS` — TMDB v4 Read Access Token (preferred Bearer auth)
  - `TMDB_API_KEY` — TMDB v3 API key (fallback query param auth, only read when `TMDB_READ_ACCESS` is unset; removed from `.env` because it was unused)
  - `TMDB_REGION` — Optional ISO-3166-1 country code for watch providers and regional lists (defaults to `US`)
  - `TMDB_API_BASE` — Optional TMDB API base URL (defaults to `https://api.tmdb.org/3`)
  - `SITE_URL` / `NEXT_PUBLIC_SITE_URL` — Optional public HTTPS origin (`SITE_URL` preferred; read only on the server by `resolvePublicOrigin`; on Vercel the origin is detected from request headers; needed when testing VidSrc `sub.info` from `localhost`, so VidSrc can reach `/api/subtitles/vidsrc`)
  - `MEDIA_API_URL` — Optional base URL of a hosted stream API serving `/streams/{type}/{id}` JSON `{ sources: [{ host, url, label?, language? }] }` for direct HLS playback in `MoviePlayer`
  - `RESOLVER_DEBUG` — Optional; `1` enables server debug logs in `lib/resolver.ts` (off by default)

## Conventions
- Next.js 16 `cacheComponents: true` + `partialPrefetching: true`: components reading `useSearchParams` or dynamic `searchParams`/`params` are wrapped in `<Suspense>`.
- Data functions use `"use cache"` paired with `cacheLife("hours" | "days" | "weeks")`.
- Strict TypeScript (`strict: true`), `@/*` path alias, Tailwind v4 CSS theme variables in `app/globals.css`.
- Client feature detection (e.g. `pictureInPictureEnabled`, `matchMedia`) uses `useSyncExternalStore` rather than `setState` inside `useEffect`.
- Responsive variants (app/globals.css): `touch` (coarse pointer), `short` (height ≤ 520px, landscape phones), `phone` (below `md` and not `short`, portrait phones: sticky header, bottom tab bar, `/search` field). `phone` never overlaps `md`/`lg`/`short`, so phone-only rules don't depend on CSS order.

## Decisions
- **2026-11-17**: Initialized `brain.md` from existing codebase.
- **2026-11-18**: Integrated Internet Archive (`archive.org`) public-domain movie lookup and a responsive HTML5 `<MoviePlayer />` on `/movie/[id]`, keeping caching inside `fetchArchiveMatchCached` so transient network failures return `null` without caching errors, and enforcing title + year (`±2`) + runtime checks so modern remakes and trailers are rejected.
- **2026-11-19**: Redesigned the home page "Browse by genre" section into `components/genre-browse.tsx` using Reelio's `bg-paper` surface tokens, distinct genre icons, mood hints, a Movies/TV Shows toggle, and a `2 -> 3 -> 4 -> 5` column responsive grid.
- **2026-11-20**: Extended `lib/stream.ts` with movie, TV episode (`STREAM_EPISODE`), VidSrc list (`STREAM_MOVIE_LIST`, `STREAM_TV_LATEST`), and subtitle (`withSubtitle` / `?sub.info=`) URL builders; updated `/api/stream/[id]` (`POST` JSON payload keeping episode/subtitle parameters out of URLs), `getTv` (`imdbId` via `external_ids`), and `/tv/[id]` (`TvEpisodePlay`).
- **2026-11-20**: Added automatic multi-language VidSrc `sub.info` support (`lib/vidsrc-subtitles.ts`, `/api/subtitles/vidsrc`, `/api/subtitles/track`) backed by keyless `opensubtitles-v3.strem.io` and normalized to CORS-enabled WebVTT (`en`, `hi`, `ta`, `te`, etc.).
- **2026-11-23**: Added `hls.js` (`hooks/use-hls.ts`) and connected `useStreams` (`hooks/use-streams.ts`) + `/api/streams/[type]/[id]` into `VideoPlayButton`, `HeroStage`, and `MoviePlayer` for direct `.m3u8` multi-audio/server playback with fallback to `/api/stream/[id]`.
- **2026-11-23**: Wired `lib/resolver.js` into `GET /api/streams/[type]/[id]` as a fallback for `type === "movie"` when `MEDIA_API_URL` is unset or fails, keeping the `{ servers }` JSON contract and leaving `tv` without hosted streams returning empty `servers` for `POST /api/stream/[id]` fallback.
- **2026-11-23**: Removed all `lib/*.test.ts` unit test files per user request.
- **2026-11-23**: Fixed `\u0026` unescaping, `tv` `season`/`episode` gate params, host deduplication, and 10s `AbortController` `mint()` timeout in `lib/resolver.js`; updated `isHlsSourceUrl` for `/api/hls`; added `GET /api/hls` proxy route (omitting `export const runtime`/`dynamic` due to `cacheComponents: true`).
- **2026-11-23**: Updated `/api/streams/[type]/[id]` (`lib/streams-resolver.ts`, 10m in-memory cache, `audioScore`, `deadSources`, reconciled `{ sources, servers }` with `/api/hls?u=` URLs), `hooks/use-streams.ts` (`sources ?? servers` + `/api/hls?u=` guard), `GET /api/audio/[type]/[id]`, and `GET /api/sub/[id]` (`lib/subtitles-lookup.ts`, `/api/subtitles/track` fallback).
- **2026-11-23**: Added `apiToken` forwarding and `mintContextCache` in `lib/resolver.js`, fixed trailing-slash `Referer: https://stellarconductornexus.com/` in `lib/streams-resolver.ts` and `app/api/hls/route.ts`, and added `#EXTM3U` buffer-header detection in `app/api/hls/route.ts` for playlists served as `text/plain`.
- **2026-11-23**: Bound `mintContextCache` TTL to the `apiToken` JWT `exp` (~60s) and added automatic re-gate refresh via `&ctx=` (`originMetaCache`) in `lib/resolver.js` / `/api/hls` so `/api/hls` succeeds even after `apiToken` expiry or on cold instances.
- **2026-11-23**: Added singleflight coalescing (`inFlightResolve`, `inFlightManifest`, `inFlightSubtitles`, `inFlightStreams`), WASM module caching (`wasmCache`), warmup-skip fast path in `mint()`, 60s DNS cache and binary `ReadableStream` segment passthrough in `/api/hls`, cached master audio renditions in `lib/streams-resolver.ts`, and `hls.js` VOD buffer/prefetch tuning in `hooks/use-hls.ts`.
- **2026-11-23**: Performance pass 1: lazy-loaded `hls.js` in `hooks/use-hls.ts` and `MoviePlayer` via `components/movie-player-lazy.tsx` in `HeroStage`/`VideoPlayButton` (removes hls.js from initial detail-page JS), streamed the Internet Archive lookup on `/movie/[id]` instead of blocking the page, parallelized archive candidate metadata fetches, set `images.minimumCacheTTL` to 31 days (TMDB image paths are immutable), and lowered banner thumbnail quality to 75.
- **2026-11-23**: Performance pass 2: added `generateStaticParams` to `/movie/[id]` and `/tv/[id]` (30 trending + popular IDs each, placeholder fallback that 404s if TMDB is unreachable at build), and deferred search-result provider badges on unfiltered `/search` (`getSearchFirstPage`, `InfiniteMediaGrid` `initialProviders`) so the grid no longer waits on one TMDB call per result.
- **2026-11-23**: Installable mobile app: `app/manifest.ts`, code-generated icons, theme-color/Apple web-app metadata, a bottom tab bar + sticky compact header on portrait phones, search moved to a field on `/search` for phones (header search toggle removed there), tap-highlight/`touch-action` tweaks and no overscroll bounce in standalone mode. No service worker (installs without one; avoids serving stale pages).
- **2026-11-23**: Phone-width polish (checked with Chrome device emulation at 390×844 and 360×780, light and dark): hero buttons stack full width on phones (`HeroActions`), "Where to watch" providers use a two-column grid with truncated names on phones, tab bar uses the short label "Upcoming". Fixed `InfiniteMediaGrid` crashing on `/search` results: a Server Component promise arrives as a thenable whose `.then()` returns undefined, so it is wrapped in `Promise.resolve()` before chaining.
- **2026-11-23**: Cached per-origin 4h `/generate.php` tokens in-process (`mintedTokenCache` on `globalThis`, outside `manifestCache`/`sources`) with automatic `401`/`403` eviction + single re-mint retry in `/api/hls`, preventing repeated 60s `vsembed.ru` re-gating and `over-cap` errors during playback/scrubbing.
- **2026-11-23**: Sealed `/api/hls?u=` target URLs and `ctx` with server-side AES-256-GCM (`lib/hls-token.ts`) and redacted upstream CDN hostnames (`Server 1`, etc.) and `file_name` from `/api/streams/[type]/[id]` client JSON so no upstream URLs or hosts appear in browser DevTools.

## Known gaps
- No automated test runner or unit test files remain in the repository.
- `findPublicDomainMovie` relies on Internet Archive metadata matching (`collection:feature_films`); if an archive item lacks year metadata or uses a substantially different title, it will not match.
- `app/api/alive/streams/route.ts` contains a pre-existing incomplete helper without an HTTP method export.
- `next build` currently fails on this machine with a Turbopack panic while starting the `@tailwindcss/turbopack` loader process for `app/globals.css` ("node process exited before we could connect"); `next dev` compiles it fine. Reproduces with the committed `next.config.ts`.

## Last verified
- **Date**: 2026-11-23
- **Commit**: `281d6af` (plus `useStreams`, `hls.js`, and `MoviePlayer` HLS integration)
