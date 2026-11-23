"use client";
import { useHls } from "@/features/player/hooks/use-hls";
import { AudioLines, Captions } from "lucide-react";
import { isHlsSourceUrl } from "@/lib/stream-sources";
import { MoviePlayerStatus } from "@/features/player/components/movie-player-status";
import type { ArchiveSubtitle, ArchiveVideoSource } from "@/lib/archive";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getPreferredVideoLanguage, languageLabel, setPreferredVideoLanguage } from "@/features/player/components/video-language-select";
import { MoviePlayerControls, MoviePlayerHeader, SKIP_SECONDS, type PlayerMenuConfig, } from "@/features/player/components/movie-player-controls";

export type MoviePlayerProps = {
  title: string;
  sources: ArchiveVideoSource[];
  poster?: string | null;
  archiveUrl?: string;
  sourceBadge?: string;
  autoPlay?: boolean;
  onClose?: () => void;
  durationHintSeconds?: number | null;
  subtitles?: ArchiveSubtitle[];
  audioLanguage?: string;
};

const SUBTITLE_PREF_KEY = "reelio:subtitle-language";

function readSubtitlePref(): string | null {
  try { return localStorage.getItem(SUBTITLE_PREF_KEY) }
  catch { return null }
}

function writeSubtitlePref(value: string) {
  try { localStorage.setItem(SUBTITLE_PREF_KEY, value) }
  catch { }
}

function setTrackModes(video: HTMLVideoElement | null, ids: string[], selected: string | null) {
  const tracks = video?.textTracks;
  if (!tracks) return;
  for (let i = 0; i < tracks.length; i++) tracks[i].mode = ids[i] === selected && selected !== null ? "showing" : "disabled";
}

const subtitleLabel = (s: ArchiveSubtitle) => `${s.language ? languageLabel(s.language) : "Subtitles"}${s.auto ? " (auto-generated)" : ""}`;
const shortCode = (language: string) => (language ? language.split("-")[0].toUpperCase() : "");

type WebkitVideoElement = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

const CONTROLS_HIDE_MS = 2600;
const noopSubscribe = () => () => { };

export function MoviePlayer({ title, sources, poster, archiveUrl, sourceBadge, autoPlay = false, onClose, durationHintSeconds, subtitles: rawSubtitles = [], audioLanguage = "" }: MoviePlayerProps) {
  const subtitles = rawSubtitles.map((s) => (s.language || !s.auto || !audioLanguage ? s : { ...s, language: audioLanguage }));
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationHintSeconds ?? 0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [failed, setFailed] = useState(false);

  const [subtitleId, setSubtitleId] = useState<string | null>(null);
  const lastSubtitleId = useRef<string | null>(null);

  const pipSupported = useSyncExternalStore(noopSubscribe, () => Boolean(document.pictureInPictureEnabled), () => false);
  const activeSource = sources[sourceIndex] ?? sources[0];

  const advanceOrFail = () => {
    setBuffering(false);
    setPlaying(false);
    if (sourceIndex + 1 < sources.length) setSourceIndex((prev) => prev + 1);
    else setFailed(true);
  };

  const hls = useHls({
    videoRef,
    src: activeSource?.url,
    autoPlay,
    onFatalError: advanceOrFail,
  });

  const audioGroups = [...new Set(sources.map((s) => s.language))];
  const currentAudio = activeSource?.language ?? "";
  const qualityOptions = sources.map((s, i) => ({ s, i })).filter(({ s }) => s.language === currentAudio);
  const audioName = (language: string) => language ? languageLabel(language) : `Original${audioLanguage ? ` (${languageLabel(audioLanguage)})` : ""}`;
  const visibleSubtitles = subtitles.filter((s) => !s.stem || s.stem === activeSource?.stem);
  const visibleIds = visibleSubtitles.map((s) => s.id).join("|");
  const trackModes = useRef({ ids: [] as string[], selected: null as string | null });
  useEffect(() => {
    trackModes.current = { ids: visibleIds ? visibleIds.split("|") : [], selected: subtitleId };
    setTrackModes(videoRef.current, trackModes.current.ids, subtitleId);
  }, [visibleIds, subtitleId]);

  function chooseSubtitle(id: string | null) {
    setSubtitleId(id);
    const chosen = subtitles.find((s) => s.id === id);
    if (chosen) lastSubtitleId.current = chosen.id;
    writeSubtitlePref(chosen ? chosen.language || "und" : "off");
  }

  function applySubtitlePreference() {
    if (subtitleId !== null) return;
    const pref = readSubtitlePref();
    if (!pref || pref === "off") return;
    const match = visibleSubtitles.find((s) => (s.language || "und") === pref) ?? visibleSubtitles.find((s) => s.language.split("-")[0] === pref.split("-")[0]);
    if (match) setSubtitleId(match.id);
  }

  const scheduleHideControls = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setControlsVisible(true);
    hideTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, CONTROLS_HIDE_MS);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => { setFullscreen(document.fullscreenElement === containerRef.current) };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const switchQuality = (nextIndex: number, playAfter = false) => {
    const video = videoRef.current;
    if (!video || nextIndex === sourceIndex) return;
    const resumeAt = video.currentTime;
    const wasPlaying = playAfter || !video.paused;
    const nextIsHls = isHlsSourceUrl(sources[nextIndex]?.url);
    setFailed(false);
    setBuffering(true);
    setSourceIndex(nextIndex);

    requestAnimationFrame(() => {
      const el = videoRef.current;
      if (!el) return;
      if (!nextIsHls) el.load();
      el.addEventListener("loadedmetadata", () => {
        if (resumeAt > 0 && Number.isFinite(el.duration)) {
          el.currentTime = Math.min(resumeAt, el.duration);
        }
        el.playbackRate = playbackRate;
        setTrackModes(el, trackModes.current.ids, trackModes.current.selected);
        if (wasPlaying) el.play().catch(() => undefined);
      }, { once: true });
    });
  };

  const switchAudio = (language: string) => {
    const next = sources.findIndex((s) => s.language === language);
    if (next < 0) return;
    if (language) setPreferredVideoLanguage(language);
    switchQuality(next);
  };

  async function togglePlay() {
    const video = videoRef.current;
    if (!video || failed) return;
    if (video.paused) {
      if (!hasStarted) {
        applySubtitlePreference();
        const pref = getPreferredVideoLanguage();
        const dub = pref ? sources.findIndex((s) => s.language === pref) : -1;
        if (dub >= 0 && dub !== sourceIndex) {
          setHasStarted(true);
          switchQuality(dub, true);
          return;
        }
      }
      try {
        await video.play();
        setHasStarted(true);
        scheduleHideControls();
      } catch {
        setPlaying(false);
      }
    } else {
      video.pause();
      setControlsVisible(true);
    }
  }

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const max = video.duration || duration || Infinity;
    const next = Math.min(Math.max(0, video.currentTime + delta), max);
    video.currentTime = next;
    setCurrentTime(next);
    scheduleHideControls();
  }, [duration, scheduleHideControls]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
    if (!nextMuted && video.volume === 0) {
      video.volume = 0.7;
      setVolume(0.7);
    }
    scheduleHideControls();
  }, [scheduleHideControls]);

  const handleVolumeChange = (nextVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.min(1, Math.max(0, nextVolume));
    video.volume = clamped;
    video.muted = clamped === 0;
    setVolume(clamped);
    setMuted(clamped === 0);
    scheduleHideControls();
  };

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    const video = videoRef.current as WebkitVideoElement | null;
    if (!container) return;
    try {
      if (document.fullscreenElement === container) await document.exitFullscreen();
      else if (container.requestFullscreen) await container.requestFullscreen();
      else video?.webkitEnterFullscreen?.();
    } catch {
      video?.webkitEnterFullscreen?.();
    }
    scheduleHideControls();
  }, [scheduleHideControls]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "SELECT" || tag === "INPUT" || tag === "A") return;
    const key = e.key.toLowerCase();
    if (key === " " || key === "k") {
      e.preventDefault();
      void togglePlay();
    } else if (key === "arrowleft" || key === "j") {
      e.preventDefault();
      seekBy(-SKIP_SECONDS);
    } else if (key === "arrowright" || key === "l") {
      e.preventDefault();
      seekBy(SKIP_SECONDS);
    } else if (key === "arrowup") {
      e.preventDefault();
      handleVolumeChange(volume + 0.1);
    } else if (key === "arrowdown") {
      e.preventDefault();
      handleVolumeChange(volume - 0.1);
    } else if (key === "m") {
      e.preventDefault();
      toggleMute();
    } else if (key === "f") {
      e.preventDefault();
      void toggleFullscreen();
    } else if (key === "c" && visibleSubtitles.length > 0) {
      e.preventDefault();
      chooseSubtitle(subtitleId ? null : (visibleSubtitles.find((s) => s.id === lastSubtitleId.current) ?? visibleSubtitles[0]).id);
    }
  };

  const showControls = controlsVisible || !playing || failed;
  const maxDuration = duration > 0 ? duration : 1;
  const progressPct = Math.min(100, (currentTime / maxDuration) * 100);
  const bufferedPct = Math.min(100, (bufferedEnd / maxDuration) * 100);
  const activeSubtitle = visibleSubtitles.find((subtitle) => subtitle.id === subtitleId);
  const menus: PlayerMenuConfig[] = [
    ...(visibleSubtitles.length > 0 ? [{
      label: "Subtitles",
      icon: <Captions className="size-3.5" />,
      summary: activeSubtitle ? shortCode(activeSubtitle.language) || "On" : "Off",
      value: subtitleId ?? "off",
      options: [
        { value: "off", label: "Subtitles off" },
        ...visibleSubtitles.map((subtitle) => ({ value: subtitle.id, label: subtitleLabel(subtitle) })),
      ],
      onChange: (value: string) => chooseSubtitle(value === "off" ? null : value),
    }] : []),
    ...(hls.audioTracks.length > 1 ? [{
      label: "Audio language",
      icon: <AudioLines className="size-3.5" />,
      summary: shortCode(hls.audioTracks.find((track) => track.id === hls.activeAudioId)?.lang ?? "") || "Audio",
      value: String(hls.activeAudioId),
      options: hls.audioTracks.map((track) => ({ value: String(track.id), label: track.name })),
      onChange: (value: string) => hls.setAudioTrack(Number(value)),
    }] : audioGroups.length > 1 ? [{
      label: "Audio language",
      icon: <AudioLines className="size-3.5" />,
      summary: shortCode(currentAudio || audioLanguage) || "Orig",
      value: currentAudio,
      options: audioGroups.map((language) => ({ value: language, label: audioName(language) })),
      onChange: switchAudio,
    }] : []),
    ...(hls.qualityLevels.length > 1 ? [{
      label: "HLS quality",
      summary: hls.activeQualityId < 0
        ? "Auto"
        : (hls.qualityLevels.find((level) => level.id === hls.activeQualityId)?.label ?? "Auto"),
      value: String(hls.activeQualityId),
      options: [
        { value: "-1", label: "Auto" },
        ...hls.qualityLevels.map((level) => ({ value: String(level.id), label: level.label })),
      ],
      onChange: (value: string) => hls.setQualityLevel(Number(value)),
    }] : []),
    ...(qualityOptions.length > 1 ? [{
      label: isHlsSourceUrl(activeSource?.url) ? "Stream server" : "Video quality",
      summary: activeSource?.label.replace(/ MP4$/, "") ?? "",
      value: String(sourceIndex),
      options: qualityOptions.map(({ s, i }) => ({ value: String(i), label: s.label })),
      onChange: (value: string) => switchQuality(Number(value)),
    }] : []),
  ];

  const handleSeek = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
    setCurrentTime(time);
    scheduleHideControls();
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    scheduleHideControls();
  };

  const togglePictureInPicture = async () => {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await videoRef.current?.requestPictureInPicture();
    } catch { }
  };

  const retryPlayback = () => {
    setFailed(false);
    setBuffering(true);
    setSourceIndex(0);
    requestAnimationFrame(() => {
      if (!isHlsSourceUrl(sources[0]?.url)) videoRef.current?.load();
      videoRef.current?.play().catch(() => setBuffering(false));
    });
  };

  return (
    <div ref={containerRef} tabIndex={0} role="region" aria-label={`${title} movie player`} onKeyDown={handleKeyDown} onMouseMove={scheduleHideControls} onTouchStart={scheduleHideControls} onMouseLeave={() => { if (playing) setControlsVisible(false) }} className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-night text-white shadow-card ring-1 ring-white/15 outline-none focus-visible:ring-2 focus-visible:ring-accent sm:rounded-[28px]"    >
      <video ref={videoRef} src={hls.hlsManaged ? undefined : activeSource?.url} poster={poster ?? undefined} playsInline preload="metadata" onClick={() => void togglePlay()} onPlay={() => {
        setPlaying(true);
        setHasStarted(true);
        setBuffering(false);
        scheduleHideControls();
      }}
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
        }}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onLoadedMetadata={(e) => {
          if (Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) {
            setDuration(e.currentTarget.duration);
          }
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onProgress={(e) => {
          const { buffered } = e.currentTarget;
          if (buffered.length > 0) setBufferedEnd(buffered.end(buffered.length - 1));
        }}
        onEnded={() => {
          setPlaying(false);
          setControlsVisible(true);
        }}
        onError={advanceOrFail}
        className="size-full bg-black object-contain">
        {visibleSubtitles.map((s) => (<track key={s.id} kind="subtitles" src={s.url} srcLang={s.language || undefined} label={subtitleLabel(s)} />))}
      </video>

      <MoviePlayerHeader title={title} sourceDescription={archiveUrl ? "Public Domain · Internet Archive" : (sourceBadge ?? "Hosted Stream · HLS")} archiveUrl={archiveUrl} onClose={onClose} menus={menus} visible={showControls} />
      <MoviePlayerStatus failed={failed} buffering={buffering} playing={playing} hasStarted={hasStarted} title={title} archiveUrl={archiveUrl} onPlay={() => void togglePlay()} onRetry={retryPlayback} />

      {!failed && (
        <MoviePlayerControls currentTime={currentTime}
          duration={duration} maxDuration={maxDuration}
          progressPct={progressPct} bufferedPct={bufferedPct}
          visible={showControls} playing={playing} muted={muted}
          volume={volume} playbackRate={playbackRate}
          fullscreen={fullscreen} pipSupported={pipSupported} onSeek={handleSeek}
          onTogglePlay={() => void togglePlay()}
          onSkipBack={() => seekBy(-SKIP_SECONDS)}
          onSkipForward={() => seekBy(SKIP_SECONDS)}
          onToggleMute={toggleMute} onVolumeChange={handleVolumeChange}
          onPlaybackRateChange={handlePlaybackRateChange}
          onTogglePictureInPicture={() => void togglePictureInPicture()}
          onToggleFullscreen={() => void toggleFullscreen()}
        />
      )}
    </div>
  );
}
