import type { ReactNode } from "react";
import { ExternalLink, Maximize, Minimize, Pause, PictureInPicture2, Play, RotateCcw, RotateCw, Volume2, VolumeX, X } from "lucide-react";

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export const SKIP_SECONDS = 10;

export type PlayerMenuOption = {
  value: string;
  label: string;
};

export type PlayerMenuConfig = {
  label: string;
  summary: string;
  value: string;
  options: PlayerMenuOption[];
  onChange: (value: string) => void;
  icon?: ReactNode;
};

type PlayerMenuProps = PlayerMenuConfig;

function PlayerMenu({ label, summary, value, options, onChange, icon }: PlayerMenuProps) {
  return (
    <label className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur transition focus-within:ring-2 focus-within:ring-white hover:bg-white/25 touch:min-h-9">
      {icon}
      <span aria-hidden>{summary}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className="absolute inset-0 cursor-pointer opacity-0">
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-night text-white">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MoviePlayerHeader({ title, sourceDescription, archiveUrl, onClose, menus, visible }: {
  title: string;
  sourceDescription: string;
  archiveUrl?: string;
  onClose?: () => void;
  menus: PlayerMenuConfig[];
  visible: boolean;
}) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 top-0 flex flex-col items-start gap-2 bg-linear-to-b from-black/80 via-black/40 to-transparent px-3 py-3 transition-opacity duration-300 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:py-4 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-white/95 sm:text-sm">{title}</p>
        <p className="text-[11px] text-white/65">{sourceDescription}</p>
      </div>
      <div className="pointer-events-auto flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:shrink-0 sm:gap-2">
        {menus.map((menu) => (
          <PlayerMenu key={menu.label} {...menu} />
        ))}
        {archiveUrl && (
          <a href={archiveUrl} target="_blank" rel="noreferrer" className="hidden items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur transition hover:bg-white/25 sm:inline-flex">
            Source <ExternalLink className="size-3" />
          </a>
        )}
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close video" title="Close video" className="grid size-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25">
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function MoviePlayerControls({
  currentTime,
  duration,
  maxDuration,
  progressPct,
  bufferedPct,
  visible,
  playing,
  muted,
  volume,
  playbackRate,
  fullscreen,
  pipSupported,
  onSeek,
  onTogglePlay,
  onSkipBack,
  onSkipForward,
  onToggleMute,
  onVolumeChange,
  onPlaybackRateChange,
  onTogglePictureInPicture,
  onToggleFullscreen,
}: {
  currentTime: number;
  duration: number;
  maxDuration: number;
  progressPct: number;
  bufferedPct: number;
  visible: boolean;
  playing: boolean;
  muted: boolean;
  volume: number;
  playbackRate: number;
  fullscreen: boolean;
  pipSupported: boolean;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onTogglePictureInPicture: () => void;
  onToggleFullscreen: () => void;
}) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/55 to-transparent px-3 pb-2.5 pt-8 transition-opacity duration-300 sm:px-5 sm:pb-3.5 ${visible ? "opacity-100" : "opacity-0 [&_*]:pointer-events-none"}`}>
      <div className="relative mb-2 flex h-5 items-center">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/25 transition-all group-hover:h-1.5 group-focus-within:h-1.5">
          <div className="h-full bg-white/35 transition-[width] duration-150" style={{ width: `${bufferedPct}%` }} />
        </div>
        <div className="pointer-events-none absolute left-0 h-1 rounded-full bg-accent transition-all group-hover:h-1.5 group-focus-within:h-1.5" style={{ width: `${progressPct}%` }} />
        <div className="pointer-events-none absolute size-3 -translate-x-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" style={{ left: `${progressPct}%` }} />
        <input
          type="range"
          min={0}
          max={maxDuration}
          step={1}
          value={Math.min(currentTime, maxDuration)}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-label="Seek"
          className="pointer-events-auto absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>

      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-0.5 sm:gap-2">
          <button type="button" onClick={onTogglePlay} aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause (Space)" : "Play (Space)"} className="grid size-9 place-items-center rounded-full text-white transition hover:bg-white/15">
            {playing ? <Pause className="size-4.5 fill-current" /> : <Play className="size-4.5 fill-current" />}
          </button>
          <button type="button" onClick={onSkipBack} aria-label={`Skip back ${SKIP_SECONDS} seconds`} title={`Skip back ${SKIP_SECONDS} seconds`} className="grid size-9 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white">
            <span className="relative grid place-items-center">
              <RotateCcw className="size-4" />
              <span className="absolute text-[8px] font-semibold leading-none">{SKIP_SECONDS}</span>
            </span>
          </button>
          <button type="button" onClick={onSkipForward} aria-label={`Skip forward ${SKIP_SECONDS} seconds`} title={`Skip forward ${SKIP_SECONDS} seconds`} className="grid size-9 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white">
            <span className="relative grid place-items-center">
              <RotateCw className="size-4" />
              <span className="absolute text-[8px] font-semibold leading-none">{SKIP_SECONDS}</span>
            </span>
          </button>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onToggleMute} aria-label={muted || volume === 0 ? "Unmute" : "Mute"} className="grid size-9 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white">
              {muted || volume === 0 ? <VolumeX className="size-4.5" /> : <Volume2 className="size-4.5" />}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(event) => onVolumeChange(Number(event.target.value))} aria-label="Volume" className="hidden h-1 w-20 cursor-pointer accent-white sm:block" />
          </div>
          <span className="ml-1 whitespace-nowrap text-[11px] tabular-nums text-white/85 sm:text-[13px]">
            {formatPlayerTime(currentTime)}
            <span className="text-white/50"> / {formatPlayerTime(duration)}</span>
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <PlayerMenu
            label="Playback speed"
            summary={`${playbackRate}x`}
            value={String(playbackRate)}
            options={PLAYBACK_RATES.map((rate) => ({ value: String(rate), label: `${rate}x` }))}
            onChange={(value) => onPlaybackRateChange(Number(value))}
          />
          {pipSupported && (
            <button type="button" onClick={onTogglePictureInPicture} aria-label="Picture in picture" title="Picture in picture" className="grid size-9 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white">
              <PictureInPicture2 className="size-4" />
            </button>
          )}
          <button type="button" onClick={onToggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} title={fullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"} className="grid size-9 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white">
            {fullscreen ? <Minimize className="size-4.5" /> : <Maximize className="size-4.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function formatPlayerTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(remainder)}` : `${minutes}:${pad(remainder)}`;
}
