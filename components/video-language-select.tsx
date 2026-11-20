"use client";

import { ChevronDown, Languages } from "lucide-react";
import { languageLabel } from "@/lib/media-language";

/** One playable version of a video in a given language ("" = original / unspecified). */
export type VideoVersion = { id: string; language: string; src: string };

const STORAGE_KEY = "reelio:video-language";

export { languageLabel };

export function getPreferredVideoLanguage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setPreferredVideoLanguage(language: string) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage blocked — the choice just isn't remembered.
  }
}

/** The remembered language if this video has it, otherwise the first (default) version. */
export function pickInitialVersion(versions: VideoVersion[]): VideoVersion | undefined {
  const preferred = getPreferredVideoLanguage();
  return versions.find((v) => preferred !== null && v.language === preferred) ?? versions[0];
}

/**
 * Language picker for the video player. A native <select>, so phones get the system picker
 * (iOS wheel / Android sheet) and keyboard users get standard behaviour.
 */
export function VideoLanguageSelect({ versions, value, onChange, className = "" }: {
  versions: VideoVersion[];
  value: string;
  onChange: (version: VideoVersion) => void;
  className?: string;
}) {
  if (versions.length < 2) return null;
  return (
    // `className` positions the wrapper (e.g. absolute in the player); the label stays `relative`
    // for its chevron — putting both on one element would let `relative` override `absolute`.
    <div className={className}>
    <label
      title="Video language"
      className="relative inline-flex items-center gap-2 rounded-full bg-black/55 py-2 pl-3 pr-8 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-black/70 touch:min-h-11"
    >
      <Languages className="size-4 shrink-0" />
      <span className="sr-only">Video language</span>
      <select
        value={value}
        onChange={(e) => {
          const next = versions.find((v) => v.id === e.target.value);
          if (next) onChange(next);
        }}
        className="max-w-48 cursor-pointer appearance-none truncate bg-transparent outline-none"
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id} className="bg-night text-white">
            {languageLabel(v.language)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-white/80" />
    </label>
    </div>
  );
}
