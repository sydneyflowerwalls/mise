import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aliasKey } from "./alias-key";

describe("alias keys", () => {
  it("collapses the same ingredient written three ways", () => {
    const keys = ["Brown onions", "1 large brown onion", "brown onion, finely diced"]
      .map(aliasKey);
    assert.equal(new Set(keys).size, 1, `expected one key, got ${JSON.stringify(keys)}`);
  });

  it("strips quantities, fractions and punctuation", () => {
    assert.equal(aliasKey("2 1/2 cups plain flour"), "cup plain flour");
  });

  it("drops parenthetical notes", () => {
    assert.equal(aliasKey("chicken thigh (skin on)"), "chicken thigh");
  });

  it("keeps genuinely different ingredients apart", () => {
    assert.notEqual(aliasKey("brown onion"), aliasKey("spring onion"));
    assert.notEqual(aliasKey("chicken thigh"), aliasKey("chicken breast"));
  });

  it("handles -ies and -oes plurals", () => {
    assert.equal(aliasKey("anchovies"), aliasKey("anchovy"));
    assert.equal(aliasKey("tomatoes"), aliasKey("tomato"));
  });

  it("never returns empty for a non-empty input", () => {
    assert.ok(aliasKey("2").length > 0);
  });
});
