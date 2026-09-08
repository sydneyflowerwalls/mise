import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAmount, scaleForServings, toBase, unitFamily } from "./units";

describe("unit families", () => {
  it("classifies mass, volume, count and imprecise", () => {
    assert.equal(unitFamily("kg"), "MASS");
    assert.equal(unitFamily("tbsp"), "VOLUME");
    assert.equal(unitFamily("clove"), "COUNT");
    assert.equal(unitFamily("pinch"), "IMPRECISE");
  });

  it("treats an unrecognised unit as a counted noun, not an error", () => {
    assert.equal(unitFamily("cob"), "COUNT");
  });

  it("treats a missing unit as a count", () => {
    assert.equal(unitFamily(null), "COUNT");
  });
});

describe("the Australian tablespoon", () => {
  it("is 20ml in an Australian recipe", () => {
    assert.equal(toBase(1, "tbsp", "AU").quantity, 20);
  });

  it("is 15ml in an imported US recipe", () => {
    assert.equal(toBase(1, "tbsp", "US").quantity, 15);
  });

  it("is 15ml in an imported UK recipe", () => {
    assert.equal(toBase(1, "tbsp", "UK").quantity, 15);
  });

  it("costs a third of the total when origin is wrong", () => {
    // 3 tbsp soy sauce: 60ml read as Australian, 45ml as American.
    const au = toBase(3, "tbsp", "AU").quantity;
    const us = toBase(3, "tbsp", "US").quantity;
    assert.equal(au, 60);
    assert.equal(us, 45);
    assert.equal(au - us, 15);
  });
});

describe("other country-varying units", () => {
  it("uses 250ml for an AU cup and 240ml for a US cup", () => {
    assert.equal(toBase(1, "cup", "AU").quantity, 250);
    assert.equal(toBase(1, "cup", "US").quantity, 240);
  });

  it("uses 5ml for a teaspoon everywhere", () => {
    for (const origin of ["AU", "US", "UK", "OTHER"] as const) {
      assert.equal(toBase(1, "tsp", origin).quantity, 5);
    }
  });
});

describe("mass conversion", () => {
  it("converts kg to grams", () => {
    assert.equal(toBase(1.5, "kg", "AU").quantity, 1500);
  });

  it("converts imperial mass", () => {
    assert.equal(Math.round(toBase(1, "lb", "US").quantity), 454);
  });
});

describe("counts stay counts", () => {
  it("keeps the counted noun and singularises it for grouping", () => {
    const base = toBase(3, "cloves", "AU");
    assert.equal(base.family, "COUNT");
    assert.equal(base.unit, "clove");
    assert.equal(base.quantity, 3);
  });

  it("maps 'each' and 'whole' to a single noun", () => {
    assert.equal(toBase(2, "each", "AU").unit, "whole");
    assert.equal(toBase(2, "whole", "AU").unit, "whole");
  });
});

describe("formatting for a supermarket aisle", () => {
  it("promotes grams to kg past 1000", () => {
    assert.equal(formatAmount({ family: "MASS", quantity: 450, unit: "g" }), "450g");
    assert.equal(formatAmount({ family: "MASS", quantity: 1200, unit: "g" }), "1.2kg");
  });

  it("promotes millilitres to litres past 1000", () => {
    assert.equal(formatAmount({ family: "VOLUME", quantity: 250, unit: "ml" }), "250ml");
    assert.equal(formatAmount({ family: "VOLUME", quantity: 1500, unit: "ml" }), "1.5L");
  });

  it("pluralises counted nouns", () => {
    assert.equal(formatAmount({ family: "COUNT", quantity: 1, unit: "clove" }), "1 clove");
    assert.equal(formatAmount({ family: "COUNT", quantity: 3, unit: "clove" }), "3 cloves");
    assert.equal(formatAmount({ family: "COUNT", quantity: 2, unit: "whole" }), "2 whole");
  });

  it("does not print float noise after scaling", () => {
    // 100g scaled by 1/3 then formatted must not read "33.333333333333336g".
    const scaled = scaleForServings(100, 3, 1)!;
    assert.equal(formatAmount({ family: "MASS", quantity: scaled, unit: "g" }), "33g");
  });

  it("renders imprecise amounts as nothing at all", () => {
    assert.equal(formatAmount({ family: "IMPRECISE", quantity: 0, unit: "pinch" }), "");
  });
});

describe("servings scaling", () => {
  it("scales a recipe for 4 up to 6", () => {
    assert.equal(scaleForServings(500, 4, 6), 750);
  });

  it("leaves quantity alone when the recipe has no serving count", () => {
    assert.equal(scaleForServings(500, 0, 6), 500);
  });

  it("passes null through — some lines genuinely have no quantity", () => {
    assert.equal(scaleForServings(null, 4, 6), null);
  });
});
