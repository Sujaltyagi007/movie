/**
 * Converts SubRip (.srt) text to WebVTT, which is what <track> needs. WebVTT input is passed
 * through (normalised). Handles BOMs, CRLF line endings and "00:01:02,345" timestamps.
 */
export function srtToVtt(text: string): string {
  const body = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").trim();
  if (/^WEBVTT/.test(body)) return `${body}\n`;
  const converted = body
    // "00:00:01,000 --> 00:00:04,000" → "00:00:01.000 --> 00:00:04.000" (also fixes 1-digit hours).
    .replace(/(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/g, (_, h: string, m: string, s: string, ms: string) => `${h.padStart(2, "0")}:${m}:${s}.${ms.padEnd(3, "0")}`)
    // SRT styling braces like {\an8} aren't valid in VTT.
    .replace(/\{\\[^}]*\}/g, "");
  return `WEBVTT\n\n${converted}\n`;
}
