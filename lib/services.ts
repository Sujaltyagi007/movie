const SEARCH_URLS: [RegExp, (q: string) => string][] = [
  [/^netflix/i, (q) => `https://www.netflix.com/search?q=${q}`],
  [/^amazon prime video|^prime video/i, (q) => `https://www.primevideo.com/search/ref=atv_nb_sug?phrase=${q}`],
  [/^amazon video/i, (q) => `https://www.amazon.com/s?k=${q}&i=instant-video`],
  [/^disney/i, (q) => `https://www.disneyplus.com/search?q=${q}`],
  [/^apple tv/i, (q) => `https://tv.apple.com/search?term=${q}`],
  [/^hulu/i, (q) => `https://www.hulu.com/search?q=${q}`],
  [/^(hbo )?max/i, (q) => `https://play.max.com/search?q=${q}`],
  [/^peacock/i, (q) => `https://www.peacocktv.com/search?q=${q}`],
  [/^paramount/i, (q) => `https://www.paramountplus.com/search/?q=${q}`],
  [/^crunchyroll/i, (q) => `https://www.crunchyroll.com/search?q=${q}`],
  [/^youtube/i, (q) => `https://www.youtube.com/results?search_query=${q}`],
  [/^google play/i, (q) => `https://play.google.com/store/search?q=${q}&c=movies`],
  [/^tubi/i, (q) => `https://tubitv.com/search/${q}`],
  [/^pluto/i, (q) => `https://pluto.tv/search/details?query=${q}`],
  [/^plex/i, (q) => `https://watch.plex.tv/search?q=${q}`],
  [/^mubi/i, (q) => `https://mubi.com/en/search/films?query=${q}`],
  [/^jiocinema|^jiohotstar|^hotstar/i, (q) => `https://www.hotstar.com/in/search?q=${q}`],
  [/^zee5/i, (q) => `https://www.zee5.com/search?q=${q}`],
  [/^sonyliv/i, (q) => `https://www.sonyliv.com/search?searchTerm=${q}`],
];

export function serviceLink(serviceName: string, title: string, fallback: string | null): string | null {
  const match = SEARCH_URLS.find(([pattern]) => pattern.test(serviceName.trim()));
  return match ? match[1](encodeURIComponent(title)) : fallback;
}
