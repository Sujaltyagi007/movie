export function srtToVtt(text: string): string {
  const body = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").trim();
  if (/^WEBVTT/.test(body)) return `${body}\n`;
  const converted = body.replace(/(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/g, (_, h: string, m: string, s: string, ms: string) => `${h.padStart(2, "0")}:${m}:${s}.${ms.padEnd(3, "0")}`).replace(/\{\\[^}]*\}/g, "");
  return `WEBVTT\n\n${converted}\n`;
}
