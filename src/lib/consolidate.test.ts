import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type PlanLine, consolidate, groupByAisle } from "./consolidate";

function line(over: Partial<PlanLine> = {}): PlanLine {
  return {
    canonicalId: "onion",
    displayName: "Onion",
    aisle: "PRODUCE",
    isImprecise: false,
    quantity: 1,
    unit: "each",
    origin: "AU",
    recipeServes: 4,
    plannedServings: 4,
    sourceMealId: "meal-1",
    sourceMealLabel: "Tue dinner",
    ...over,
  };
}

describe("summing within a unit family", () => {
  it("adds 200g and 300g onion into 500g", () => {
    const [item] = consolidate([
      line({ quantity: 200, unit: "g" }),
      line({ quantity: 300, unit: "g", sourceMealId: "meal-2" }),
    ]);
    assert.equal(item.display, "500g");
    assert.equal(item.amounts.length, 1);
  });

  it("adds across different units in the same family", () => {
    // 500g + 1kg = 1.5kg
    const [item] = consolidate([
      line({ quantity: 500, unit: "g" }),
      line({ quantity: 1, unit: "kg", sourceMealId: "meal-2" }),
    ]);
    assert.equal(item.display, "1.5kg");
  });

  it("adds tablespoons and millilitres as one volume", () => {
    // 2 AU tbsp (40ml) + 60ml = 100ml
    const [item] = consolidate([
      line({ canonicalId: "soy", displayName: "Soy sauce", quantity: 2, unit: "tbsp" }),
      line({ canonicalId: "soy", displayName: "Soy sauce", quantity: 60, unit: "ml", sourceMealId: "m2" }),
    ]);
    assert.equal(item.display, "100ml");
  });
});

describe("keeping unit families separate", () => {
  it('shows "2 whole + 150g" rather than inventing a single number', () => {
    const [item] = consolidate([
      line({ quantity: 2, unit: "each" }),
      line({ quantity: 150, unit: "g", sourceMealId: "meal-2" }),
    ]);
    assert.equal(item.amounts.length, 2);
    assert.equal(item.display, "150g + 2 whole");
  });

  it("keeps different counted nouns apart", () => {
    // 2 whole garlic bulbs is not 3 cloves.
    const [item] = consolidate([
      line({ canonicalId: "garlic", displayName: "Garlic", quantity: 2, unit: "head" }),
      line({ canonicalId: "garlic", displayName: "Garlic", quantity: 3, unit: "cloves", sourceMealId: "m2" }),
    ]);
    assert.equal(item.amounts.length, 2);
    assert.ok(item.display.includes("2 heads"));
    assert.ok(item.display.includes("3 cloves"));
  });
});

describe("origin-aware summing", () => {
  it("respects each recipe's own tablespoon when combining", () => {
    // 1 AU tbsp (20ml) + 1 US tbsp (15ml) = 35ml, not 40 and not 30.
    const [item] = consolidate([
      line({ canonicalId: "oil", displayName: "Sesame oil", quantity: 1, unit: "tbsp", origin: "AU" }),
      line({ canonicalId: "oil", displayName: "Sesame oil", quantity: 1, unit: "tbsp", origin: "US", sourceMealId: "m2" }),
    ]);
    assert.equal(item.display, "35ml");
  });
});

describe("servings scaling feeds the list", () => {
  it("multiplies a recipe for 4 cooked for 6", () => {
    const [item] = consolidate([
      line({ quantity: 400, unit: "g", recipeServes: 4, plannedServings: 6 }),
    ]);
    assert.equal(item.display, "600g");
  });
});

describe("imprecise ingredients", () => {
  it("carries no quantity and becomes a plain check-item", () => {
    const [item] = consolidate([
      line({ canonicalId: "salt", displayName: "Salt", isImprecise: true, quantity: 1, unit: "tsp" }),
      line({ canonicalId: "salt", displayName: "Salt", isImprecise: true, quantity: 2, unit: "tsp", sourceMealId: "m2" }),
    ]);
    assert.equal(item.display, "");
    assert.equal(item.amounts.length, 0);
  });

  it("drops a pinch without poisoning a real total", () => {
    const [item] = consolidate([
      line({ canonicalId: "chilli", displayName: "Chilli flakes", quantity: 20, unit: "g" }),
      line({ canonicalId: "chilli", displayName: "Chilli flakes", quantity: 1, unit: "pinch", sourceMealId: "m2" }),
    ]);
    assert.equal(item.display, "20g");
  });
});

describe("provenance", () => {
  it("records every meal a line came from, without duplicates", () => {
    const [item] = consolidate([
      line({ quantity: 1, unit: "each", sourceMealId: "m1", sourceMealLabel: "Tue dinner" }),
      line({ quantity: 1, unit: "each", sourceMealId: "m1", sourceMealLabel: "Tue dinner" }),
      line({ quantity: 1, unit: "each", sourceMealId: "m2", sourceMealLabel: "Thu dinner" }),
    ]);
    assert.deepEqual(item.sources.map((s) => s.label), ["Tue dinner", "Thu dinner"]);
    assert.equal(item.display, "3 whole");
  });
});

describe("aisle grouping", () => {
  it("orders sections as a single walk through the shop", () => {
    const groups = groupByAisle(
      consolidate([
        line({ canonicalId: "bread", displayName: "Bread", aisle: "BAKERY" }),
        line({ canonicalId: "onion", displayName: "Onion", aisle: "PRODUCE" }),
        line({ canonicalId: "mince", displayName: "Beef mince", aisle: "MEAT_SEAFOOD" }),
      ]),
    );
    assert.deepEqual(groups.map((g) => g.label), ["Produce", "Meat & Seafood", "Bakery"]);
  });

  it("omits sections with nothing in them", () => {
    const groups = groupByAisle(consolidate([line({ aisle: "PRODUCE" })]));
    assert.equal(groups.length, 1);
  });
});
