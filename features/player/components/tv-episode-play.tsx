"use client";
import type { Season, Trailer } from "@/lib/tmdb";
import { Fragment, useEffect, useState } from "react";
import { TrailerButton } from "@/features/player/components/trailer-button";
import { VideoPlayButton } from "@/features/player/components/video-play-button";

type SubtitleOption = {
  langCode: string;
  label: string;
};

type TvEpisodePlayProps = {
  id: number;
  imdbId: string | null;
  title: string;
  seasons: Season[];
  trailerKey: string | null;
  trailers?: Trailer[];
};

export function TvEpisodePlay({ id, imdbId, title, seasons, trailerKey, trailers }: TvEpisodePlayProps) {
  const regular = seasons.filter((s) => s.number > 0);
  const availableSeasons = regular.length > 0 ? regular : seasons.length > 0 ? seasons : [{ id: 1, name: "Season 1", number: 1, episodes: 1, date: "", posterPath: null }];
  const [season, setSeason] = useState(availableSeasons[0].number);
  const [episode, setEpisode] = useState(1);
  const [subLang, setSubLang] = useState("");
  const [subState, setSubState] = useState<{ key: string; tracks: SubtitleOption[] }>({ key: "", tracks: [] });
  const activeSeason = availableSeasons.find((s) => s.number === season) ?? availableSeasons[0];
  const episodeCount = Math.max(activeSeason.episodes, 1);
  const safeEpisode = Math.min(episode, episodeCount);
  const requestKey = imdbId ? `${imdbId}:${activeSeason.number}:${safeEpisode}` : "";
  const loadingSubs = Boolean(requestKey) && subState.key !== requestKey;
  const tracks = subState.key === requestKey ? subState.tracks : [];
  const effectiveLang = tracks.some((t) => t.langCode === subLang) ? subLang : "";

  useEffect(() => {
    if (!imdbId || !requestKey) return;
    const controller = new AbortController();

    fetch("/api/subtitles/vidsrc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imdbId, season: activeSeason.number, episode: safeEpisode }),
      signal: controller.signal,
    }).then((res) => (res.ok ? res.json() : { tracks: [] })).then((data: { tracks?: SubtitleOption[] }) => {
      if (!controller.signal.aborted) {
        setSubState({ key: requestKey, tracks: Array.isArray(data.tracks) ? data.tracks : [] });
      }
    }).catch(() => {
      if (!controller.signal.aborted) {
        setSubState({ key: requestKey, tracks: [] });
      }
    });
    return () => controller.abort();
  }, [imdbId, requestKey, activeSeason.number, safeEpisode]);

  function handleSeasonChange(nextSeason: number) {
    setSeason(nextSeason);
    setEpisode(1);
  }

  const selectClass = "rounded-full bg-white/12 px-3.5 py-2 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-60";

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="sr-only" htmlFor="tv-season-select">
          Season
        </label>
        <select id="tv-season-select" value={activeSeason.number} onChange={(e) => handleSeasonChange(Number(e.target.value))} className={selectClass} >
          {availableSeasons.map((s) => (
            <option key={s.id} value={s.number} className="bg-night text-white">
              {s.name || `Season ${s.number}`}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="tv-episode-select"> Episode </label>
        <select id="tv-episode-select" value={safeEpisode} onChange={(e) => setEpisode(Number(e.target.value))} className={selectClass}>
          {Array.from({ length: episodeCount }, (_, i) => i + 1).map((ep) => (
            <option key={ep} value={ep} className="bg-night text-white">
              Episode {ep}
            </option>
          ))}
        </select>

        {imdbId && (
          <Fragment>
            <label className="sr-only" htmlFor="tv-subtitle-select"> Available subtitles </label>
            <select id="tv-subtitle-select" value={effectiveLang} disabled={loadingSubs || tracks.length === 0} onChange={(e) => setSubLang(e.target.value)} className={selectClass}>
              {loadingSubs ? (
                <option value="" className="bg-night text-white">
                  Subtitles: Checking…
                </option>
              ) : tracks.length === 0 ? (
                <option value="" className="bg-night text-white">
                  No subtitles found
                </option>
              ) : (
                <Fragment>
                  <option value="" className="bg-night text-white">
                    Subtitles: All ({tracks.length})
                  </option>
                  {tracks.map((track) => (
                    <option key={track.langCode} value={track.langCode} className="bg-night text-white">
                      {track.label}
                    </option>
                  ))}
                </Fragment>
              )}
            </select>
          </Fragment>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <VideoPlayButton label={`Play S${activeSeason.number} · E${safeEpisode}`} title={`${title} · S${activeSeason.number} E${safeEpisode}`} mediaId={id} imdbId={imdbId} mediaType="tv" season={activeSeason.number} episode={safeEpisode} subLang={effectiveLang} />
        {trailerKey && (<TrailerButton videoKey={trailerKey} trailers={trailers} title={title} variant="glass" />
        )}
      </div>
    </div>
  );
}
