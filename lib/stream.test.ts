import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import { describe, it } from "node:test";
import type * as StreamModule from "./stream";

type ResolveHook = (
  specifier: string,
  context: Record<string, unknown>,
  nextResolve: (specifier: string, context: Record<string, unknown>) => unknown,
) => unknown;

function hasRegisterHooks(mod: object): mod is { registerHooks: (hooks: { resolve: ResolveHook }) => void } {
  return "registerHooks" in mod && typeof mod.registerHooks === "function";
}

if (hasRegisterHooks(nodeModule)) {
  nodeModule.registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "./stream") return nextResolve("./stream.ts", context);
      return nextResolve(specifier, context);
    },
  });
}

const { STREAM_EPISODE, STREAM_MOVIE, STREAM_MOVIE_LIST, STREAM_TV_LATEST, withSubtitle } =
  (await import("./stream")) as typeof StreamModule;

describe("lib/stream", () => {
  it("builds movie, TV episode, and list URLs", () => {
    assert.equal(STREAM_MOVIE(550), "https://vidsrc.mov/embed/movie/550");
    assert.equal(STREAM_EPISODE("tt0944947", 1, 5), "https://vidsrc.mov/embed/tv/tt0944947/1/5");
    assert.equal(STREAM_MOVIE_LIST(15), "https://vidsrc.mov/vapi/movie/new/15");
    assert.equal(STREAM_TV_LATEST, "https://vidsrc.mov/vapi/episode/latest");
  });

  it("appends valid subtitle URLs as sub.info and rejects unsafe protocols", () => {
    assert.equal(
      STREAM_EPISODE("tt0944947", 1, 5, "https://subs.example.com/got-s1e5.json"),
      "https://vidsrc.mov/embed/tv/tt0944947/1/5?sub.info=https%3A%2F%2Fsubs.example.com%2Fgot-s1e5.json",
    );
    assert.equal(withSubtitle("https://vidsrc.mov/embed/movie/550", "   "), "https://vidsrc.mov/embed/movie/550");
    assert.throws(() => withSubtitle("https://vidsrc.mov/embed/movie/550", "javascript:alert(1)"));
    assert.throws(() => withSubtitle("https://vidsrc.mov/embed/movie/550", "not-a-url"));
  });
});
