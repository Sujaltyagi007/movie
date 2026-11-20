import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import { describe, it } from "node:test";
import type * as SubtitlesModule from "./vidsrc-subtitles";

type ResolveHook = (
  specifier: string,
  context: Record<string, unknown>,
  nextResolve: (specifier: string, context: Record<string, unknown>) => unknown,
) => unknown;

type LoadHook = (
  url: string,
  context: Record<string, unknown>,
  nextLoad: (url: string, context: Record<string, unknown>) => unknown,
) => unknown;

function hasRegisterHooks(mod: object): mod is { registerHooks: (hooks: { resolve: ResolveHook; load: LoadHook }) => void } {
  return "registerHooks" in mod && typeof mod.registerHooks === "function";
}

if (hasRegisterHooks(nodeModule)) {
  nodeModule.registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "next/cache") return { url: "virtual:next-cache", shortCircuit: true };
      if (specifier === "./vidsrc-subtitles") return nextResolve("./vidsrc-subtitles.ts", context);
      if (specifier === "@/lib/media-language") return nextResolve("./media-language.ts", context);
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url === "virtual:next-cache") {
        return { format: "module", source: "export function cacheLife() {}", shortCircuit: true };
      }
      return nextLoad(url, context);
    },
  });
}

const {
  buildVidsrcSubtitleEntries,
  buildVidsrcSubtitlesManifestUrl,
  normalizeOpenSubtitlesTracks,
  prioritizeSubtitleLanguage,
  resolvePublicOrigin,
} = (await import("./vidsrc-subtitles")) as typeof SubtitlesModule;

describe("lib/vidsrc-subtitles", () => {
  it("normalizes and prioritizes English, Hindi, Tamil, Telugu, and other languages", () => {
    const tracks = normalizeOpenSubtitlesTracks([
      { id: "s1", url: "https://subs.example.com/fr.srt", lang: "fra" },
      { id: "s2", url: "https://subs.example.com/te.srt", lang: "tel" },
      { id: "s3", url: "https://subs.example.com/hi.srt", lang: "hin" },
      { id: "s4", url: "https://subs.example.com/ta.srt", lang: "tam" },
      { id: "s5", url: "https://subs.example.com/en.srt", lang: "eng" },
      { id: "s6", url: "https://subs.example.com/en2.srt", lang: "eng" },
      { id: "bad", url: "javascript:alert(1)", lang: "eng" },
    ]);

    assert.deepEqual(
      tracks.map((t) => t.langCode),
      ["en", "hi", "ta", "te", "fr"],
    );
  });

  it("builds VidSrc manifest and track URLs with exact { file, label } schema", () => {
    const manifest = buildVidsrcSubtitlesManifestUrl("https://reelio.example.com", {
      imdbId: "tt0944947",
      season: 1,
      episode: 5,
      lang: "hi",
    });
    assert.equal(manifest, "https://reelio.example.com/api/subtitles/vidsrc?id=tt0944947&season=1&episode=5&lang=hi");

    const reordered = prioritizeSubtitleLanguage(
      [
        { id: "en-1", langCode: "en", label: "English", url: "https://subs.example.com/en.srt" },
        { id: "hi-1", langCode: "hi", label: "Hindi", url: "https://subs.example.com/hi.srt" },
      ],
      "hi",
    );
    assert.deepEqual(reordered.map((t) => t.langCode), ["hi", "en"]);

    const entries = buildVidsrcSubtitleEntries(
      "https://reelio.example.com",
      { imdbId: "tt0944947", season: 1, episode: 5 },
      [{ id: "sub-1", langCode: "en", label: "English", url: "https://subs.example.com/en.srt" }],
    );
    assert.deepEqual(entries, [
      {
        file: "https://reelio.example.com/api/subtitles/track?id=tt0944947&track=sub-1&season=1&episode=5",
        label: "English",
      },
    ]);
  });

  it("rejects localhost origins unless NEXT_PUBLIC_SITE_URL provides a public HTTPS origin", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    try {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      const localReq = new Request("http://localhost:3000/api/stream/550");
      assert.equal(resolvePublicOrigin(localReq), null);

      const prodReq = new Request("https://reelio.example.com/api/stream/550");
      assert.equal(resolvePublicOrigin(prodReq), "https://reelio.example.com");

      process.env.NEXT_PUBLIC_SITE_URL = "https://tunnel.example.com/";
      assert.equal(resolvePublicOrigin(localReq), "https://tunnel.example.com");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });
});
