"use client";
import type Hls from "hls.js";
import { isHlsSourceUrl } from "@/lib/stream-sources";
import { useEffect, useRef, useState, type RefObject } from "react";
import { getPreferredVideoLanguage, languageLabel, setPreferredVideoLanguage } from "@/features/player/components/video-language-select";

export type HlsAudioOption = {
  id: number;
  name: string;
  lang: string;
};

export type HlsQualityOption = {
  id: number;
  label: string;
  height: number;
};

type NativeAudioTrack = {
  id: string;
  label: string;
  language: string;
  enabled: boolean;
};

type NativeAudioTrackList = EventTarget & {
  length: number;
  [index: number]: NativeAudioTrack;
};

type VideoWithAudioTracks = HTMLVideoElement & {
  audioTracks?: NativeAudioTrackList;
};

type HlsState = {
  src: string;
  audioTracks: HlsAudioOption[];
  activeAudioId: number;
  qualityLevels: HlsQualityOption[];
  activeQualityId: number;
};

const EMPTY_STATE: HlsState = {
  src: "",
  audioTracks: [],
  activeAudioId: -1,
  qualityLevels: [],
  activeQualityId: -1,
};

function formatAudioLabel(name: string, lang: string, index: number): string {
  const cleanName = name.trim();
  if (cleanName) return cleanName;
  if (lang.trim()) return languageLabel(lang.trim());
  return `Audio ${index + 1}`;
}

function matchesPreferredLanguage(trackLang: string, preferred: string | null): boolean {
  if (!preferred || !trackLang) return false;
  const a = trackLang.trim().toLowerCase();
  const b = preferred.trim().toLowerCase();
  return a === b || a.split("-")[0] === b.split("-")[0];
}

type MseWindow = typeof globalThis & {
  ManagedMediaSource?: typeof MediaSource;
  WebKitMediaSource?: typeof MediaSource;
  WebKitSourceBuffer?: typeof SourceBuffer;
};

export function isHlsJsSupported(): boolean {
  if (typeof self === "undefined") return false;
  const w = self as MseWindow;
  const mediaSource = w.ManagedMediaSource || w.MediaSource || w.WebKitMediaSource;
  if (!mediaSource) return false;
  const sourceBuffer = w.SourceBuffer || w.WebKitSourceBuffer;
  if (sourceBuffer && !(sourceBuffer.prototype && typeof sourceBuffer.prototype.appendBuffer === "function" && typeof sourceBuffer.prototype.remove === "function")) return false;
  if (typeof mediaSource.isTypeSupported !== "function") return false;
  return (
    ["avc1.42E01E,mp4a.40.2", "av01.0.01M.08", "vp09.00.50.08"].some((c) => mediaSource.isTypeSupported(`video/mp4;codecs=${c}`)) ||
    ["mp4a.40.2", "fLaC"].some((c) => mediaSource.isTypeSupported(`audio/mp4;codecs=${c}`))
  );
}

export function preloadHls() {
  void import("hls.js").catch(() => undefined);
}

function applyNativeAudioTrack(video: VideoWithAudioTracks | null, trackId: number) {
  const nativeTracks = video?.audioTracks;
  if (!nativeTracks) return;
  for (let i = 0; i < nativeTracks.length; i++) {
    nativeTracks[i].enabled = i === trackId;
  }
}

export function useHls({ videoRef, src, autoPlay = false, onFatalError }: { videoRef: RefObject<HTMLVideoElement | null>; src?: string; autoPlay?: boolean; onFatalError?: () => void }) {
  const hlsRef = useRef<Hls | null>(null);
  const onFatalRef = useRef(onFatalError);
  useEffect(() => {
    onFatalRef.current = onFatalError;
  }, [onFatalError]);

  const [state, setState] = useState<HlsState>(EMPTY_STATE);
  const isHls = isHlsSourceUrl(src);
  const hlsSupported = typeof window !== "undefined" && isHlsJsSupported();
  const hlsManaged = Boolean(isHls && src && hlsSupported);

  useEffect(() => {
    const video = videoRef.current as VideoWithAudioTracks | null;
    if (!video || !src || !isHls) return;

    if (isHlsJsSupported()) {
      let cancelled = false;
      let instance: Hls | null = null;

      import("hls.js").then(({ default: HlsLib }) => {
        if (cancelled) return;
        const hls = new HlsLib({
          enableWorker: true,
          startFragPrefetch: true,
          capLevelToPlayerSize: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 120,
          backBufferLength: 30,
          fragLoadingTimeOut: 20_000,
          fragLoadingMaxRetry: 4,
          manifestLoadingMaxRetry: 3,
        });
        instance = hls;
        hlsRef.current = hls;

        let recoveredNetwork = false;
        let recoveredMedia = false;

        const syncTracks = () => {
          const audioTracks = hls.audioTracks.map((t, i) => ({
            id: t.id, name: formatAudioLabel(t.name, t.lang ?? "", i), lang: t.lang ?? "",
          }));
          const qualityLevels = hls.levels.map((level, id) => ({
            id, height: level.height,
            label: level.height ? `${level.height}p` : `${Math.max(1, Math.round(level.bitrate / 1000))}k`,
          }));
          setState({
            src, audioTracks,
            activeAudioId: hls.audioTrack,
            qualityLevels, activeQualityId: hls.currentLevel,
          });
        };

        hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
          const preferred = getPreferredVideoLanguage();
          const preferredTrack = hls.audioTracks.find((t) => matchesPreferredLanguage(t.lang ?? "", preferred));
          if (preferredTrack && preferredTrack.id !== hls.audioTrack) {
            hls.audioTrack = preferredTrack.id;
          }
          syncTracks();
          if (autoPlay) {
            video.play().catch(() => undefined);
          }
        });

        hls.on(HlsLib.Events.AUDIO_TRACKS_UPDATED, syncTracks);
        hls.on(HlsLib.Events.AUDIO_TRACK_SWITCHED, (_event, data) => {
          setState((prev) => (prev.src === src ? { ...prev, activeAudioId: data.id } : prev));
        });

        hls.on(HlsLib.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR && !recoveredNetwork) {
            recoveredNetwork = true;
            hls.startLoad();
            return;
          }
          if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR && !recoveredMedia) {
            recoveredMedia = true;
            hls.recoverMediaError();
            return;
          }
          hls.destroy();
          if (hlsRef.current === hls) hlsRef.current = null;
          onFatalRef.current?.();
        });

        hls.loadSource(src);
        hls.attachMedia(video);
      }).catch(() => {
        if (!cancelled) onFatalRef.current?.();
      });

      return () => {
        cancelled = true;
        if (!instance) return;
        instance.destroy();
        if (hlsRef.current === instance) hlsRef.current = null;
      };
    }

    const nativeTracks = video.audioTracks;
    if (!nativeTracks) return;

    const syncNative = () => {
      const list: HlsAudioOption[] = [];
      let activeId = -1;
      for (let i = 0; i < nativeTracks.length; i++) {
        const t = nativeTracks[i];
        list.push({ id: i, name: formatAudioLabel(t.label, t.language, i), lang: t.language });
        if (t.enabled && activeId === -1) activeId = i;
      }
      setState({
        src,
        audioTracks: list,
        activeAudioId: activeId,
        qualityLevels: [],
        activeQualityId: -1,
      });
    };

    nativeTracks.addEventListener("addtrack", syncNative);
    nativeTracks.addEventListener("removetrack", syncNative);
    nativeTracks.addEventListener("change", syncNative);
    syncNative();

    return () => {
      nativeTracks.removeEventListener("addtrack", syncNative);
      nativeTracks.removeEventListener("removetrack", syncNative);
      nativeTracks.removeEventListener("change", syncNative);
    };
  }, [videoRef, src, isHls, autoPlay]);

  const activeState = isHls && src && state.src === src ? state : EMPTY_STATE;

  function setAudioTrack(trackId: number) {
    const chosen = activeState.audioTracks.find((t) => t.id === trackId);
    if (chosen?.lang) setPreferredVideoLanguage(chosen.lang);

    const hls = hlsRef.current;
    if (hls) {
      hls.audioTrack = trackId;
      setState((prev) => (prev.src === src ? { ...prev, activeAudioId: trackId } : prev));
      return;
    }

    applyNativeAudioTrack(videoRef.current as VideoWithAudioTracks | null, trackId);
    setState((prev) => (prev.src === src ? { ...prev, activeAudioId: trackId } : prev));
  }

  function setQualityLevel(levelId: number) {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = levelId;
    setState((prev) => (prev.src === src ? { ...prev, activeQualityId: levelId } : prev));
  }

  return {
    hlsManaged, audioTracks: activeState.audioTracks, activeAudioId: activeState.activeAudioId, setAudioTrack,
    qualityLevels: activeState.qualityLevels, activeQualityId: activeState.activeQualityId, setQualityLevel,
  };
}
