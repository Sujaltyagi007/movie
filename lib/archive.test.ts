import test from "node:test";
import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import type * as ArchiveModule from "./archive";

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

function hasRegisterHooks(mod: object,): mod is { registerHooks: (hooks: { resolve: ResolveHook; load: LoadHook }) => void } {
  return "registerHooks" in mod && typeof mod.registerHooks === "function";
}

if (hasRegisterHooks(nodeModule)) {
  nodeModule.registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "next/cache") { return { url: "virtual:next-cache", shortCircuit: true } }
      if (specifier === "./archive") { return nextResolve("./archive.ts", context) }
      if (specifier === "./media-language") { return nextResolve("./media-language.ts", context) }
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

const { extractYear, findPublicDomainMovie, normalizeTitle, parseDurationSeconds, selectPlayableSources, selectSubtitles } = (await import("./archive")) as typeof ArchiveModule;

test("selectPlayableSources tags dubbed files with their audio language", () => {
  const files = [
    { name: "metropolis.mp4", format: "h.264", size: "900000000", length: "8800", height: "720" },
    { name: "metropolis_spanish.mp4", format: "h.264", size: "900000000", length: "8800", height: "720" },
    { name: "It_Happened_One_Night.mp4", format: "h.264", size: "900000000", length: "6300", height: "480" },
  ];
  const { sources } = selectPlayableSources("item", files, null);
  const byName = Object.fromEntries(sources.map((s) => [s.url.split("/").pop(), s.language]));
  assert.equal(byName["metropolis.mp4"], "");
  assert.equal(byName["metropolis_spanish.mp4"], "es");
  // A title word ("It") must not be read as Italian.
  assert.equal(byName["It_Happened_One_Night.mp4"], "");
});

test("selectSubtitles labels languages, pairs cuts, and puts human subtitles first", () => {
  const subs = selectSubtitles("mon-oncle", [
    { name: "mon-oncle-720p.asr.srt", size: "50000" },
    { name: "eng.vtt", size: "60000" },
    { name: "pt-br.srt", size: "60000" },
    { name: "notes.txt" },
    { name: "huge.srt", size: String(10 * 1024 * 1024) },
  ], "fr", ["mon oncle"]);
  assert.deepEqual(subs.map((s) => [s.language, s.auto, s.stem]), [
    ["en", false, ""],
    ["pt-BR", false, ""],
    ["fr", true, "mon oncle"], // auto captions take the item's language, tied to the matching cut
  ]);
  assert.match(subs[0].url, /^\/api\/subtitles\?item=mon-oncle&file=eng\.vtt$/);
});

test("normalizeTitle strips years, punctuation, and accents", () => {
  assert.equal(normalizeTitle("Night of the Living Dead (1968)"), "night of the living dead");
  assert.equal(normalizeTitle("D.O.A."), "d o a");
  assert.equal(normalizeTitle("Amélie & Friends"), "amelie and friends");
});

test("extractYear and parseDurationSeconds handle numeric and formatted inputs", () => {
  assert.equal(extractYear("1968-10-01"), 1968);
  assert.equal(extractYear("invalid"), null);
  assert.equal(parseDurationSeconds("5760.4"), 5760);
  assert.equal(parseDurationSeconds("1:36:05"), 5765);
  assert.equal(parseDurationSeconds("0"), null);
});

test("selectPlayableSources ranks HD MP4 ahead of 512kb and filters trailers", () => {
  const { sources, durationSeconds } = selectPlayableSources("night_of_the_living_dead", [
    { name: "trailer.mp4", format: "MPEG4", size: "15000000", length: "120", height: "720" },
    { name: "film_512kb.mp4", format: "512Kb MPEG4", size: "350000000", length: "5760", height: "360" },
    { name: "film.mp4", format: "h.264 .mp4", size: "1200000000", length: "5760", width: "1280", height: "720" },
    { name: "metadata.xml", format: "Metadata", size: "1024" },
  ], 96,);

  assert.equal(sources.length, 2);
  assert.equal(sources[0].label, "720p MP4");
  assert.equal(sources[0].url, "https://archive.org/download/night_of_the_living_dead/film.mp4");
  assert.equal(sources[1].label, "Compact (512kb)");
  assert.equal(durationSeconds, 5760);
});

test("selectPlayableSources rejects clips much shorter than TMDB runtime", () => {
  const { sources } = selectPlayableSources("some_item", [{ name: "clip.mp4", format: "MPEG4", size: "90000000", length: "180", height: "720" }], 95,);
  assert.equal(sources.length, 0);
});

test("findPublicDomainMovie returns null cleanly on network failure", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("offline"); }) as typeof fetch;

  try {
    const result = await findPublicDomainMovie({
      title: "Night of the Living Dead",
      releaseDate: "1968-10-01",
      runtimeMinutes: 96,
    });
    assert.equal(result, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("findPublicDomainMovie matches valid title/year and skips mismatched remakes", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("advancedsearch.php")) {
      return new Response(
        JSON.stringify({
          response: {
            docs: [{ identifier: "night_of_the_living_dead", title: "Night of the Living Dead", year: "1968" }],
          },
        }), { status: 200 }
      );
    }
    return new Response(
      JSON.stringify({
        is_dark: false,
        metadata: { identifier: "night_of_the_living_dead", title: "Night of the Living Dead", year: "1968" },
        files: [{ name: "night_of_the_living_dead.mp4", format: "h.264 .mp4", size: "900000000", length: "5750", height: "720" }],
      }), { status: 200 }
    );
  }) as typeof fetch;

  try {
    const match1968 = await findPublicDomainMovie({
      title: "Night of the Living Dead",
      releaseDate: "1968-10-01",
      runtimeMinutes: 96,
    });
    assert.ok(match1968);
    assert.equal(match1968.identifier, "night_of_the_living_dead");
    assert.equal(match1968.sources.length, 1);

    const remake1990 = await findPublicDomainMovie({
      title: "Night of the Living Dead",
      releaseDate: "1990-10-19",
      runtimeMinutes: 88,
    });
    assert.equal(remake1990, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
