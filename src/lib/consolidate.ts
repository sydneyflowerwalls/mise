/**
 * Shopping list consolidation (product brief §6.2).
 *
 * The four steps, in order:
 *   1. Canonicalise the ingredient — done upstream, via the alias table.
 *   2. Convert within a unit family (g/kg -> grams, ml/L/tsp/tbsp/cup -> ml).
 *   3. Sum within a family, keep families separate. 200g + 300g onion is
 *      500g. "2 onions" + "150g onion" is not a number — it is "2 whole +
 *      150g" under one heading.
 *   4. Imprecise amounts (salt, pepper, oil) become a check-item with no
 *      quantity, and are dropped when the pantry has them.
 *
 * Pure functions, no database, no LLM. Tested in consolidate.test.ts.
 */

import {
  type Origin,
  type UnitFamily,
  formatAmount,
  scaleForServings,
  toBase,
} from "./units";

export type Aisle =
  | "PRODUCE" | "MEAT_SEAFOOD" | "DELI" | "DAIRY_EGGS" | "BAKERY"
  | "PANTRY" | "FREEZER" | "DRINKS" | "HOUSEHOLD" | "OTHER";

/** Default walk order through an Australian supermarket. User-reorderable. */
export const AISLE_ORDER: Aisle[] = [
  "PRODUCE", "MEAT_SEAFOOD", "DELI", "DAIRY_EGGS", "BAKERY",
  "PANTRY", "FREEZER", "DRINKS", "HOUSEHOLD", "OTHER",
];

export const AISLE_LABEL: Record<Aisle, string> = {
  PRODUCE: "Produce",
  MEAT_SEAFOOD: "Meat & Seafood",
  DELI: "Deli",
  DAIRY_EGGS: "Dairy & Eggs",
  BAKERY: "Bakery",
  PANTRY: "Pantry",
  FREEZER: "Freezer",
  DRINKS: "Drinks",
  HOUSEHOLD: "Household",
  OTHER: "Other",
};

/** One ingredient line from one planned meal, before consolidation. */
export interface PlanLine {
  canonicalId: string;
  displayName: string;
  aisle: Aisle;
  isImprecise: boolean;
  quantity: number | null;
  unit: string | null;
  /** Origin of the recipe this line came from — decides tbsp = 20ml or 15ml. */
  origin: Origin;
  recipeServes: number;
  plannedServings: number;
  /** For "which meal(s) is this for?" on the list (§6.1). */
  sourceMealId: string;
  sourceMealLabel: string;
}

export interface ConsolidatedAmount {
  family: UnitFamily;
  quantity: number;
  unit: string;
  /** Pre-rendered: "500g", "2 whole", "1.5L". */
  display: string;
}

export interface ConsolidatedItem {
  canonicalId: string;
  displayName: string;
  aisle: Aisle;
  isImprecise: boolean;
  amounts: ConsolidatedAmount[];
  /** "500g" or, when families split, "2 whole + 150g". Empty when imprecise. */
  display: string;
  sources: { mealId: string; label: string }[];
}

/** Within COUNT, "clove" and "whole" are different things and stay apart. */
function familyKey(family: UnitFamily, unit: string): string {
  return family === "COUNT" ? `COUNT:${unit}` : family;
}

export function consolidate(lines: PlanLine[]): ConsolidatedItem[] {
  const byIngredient = new Map<string, ConsolidatedItem>();
  // canonicalId -> familyKey -> running total in base units
  const totals = new Map<string, Map<string, ConsolidatedAmount>>();

  for (const line of lines) {
    let item = byIngredient.get(line.canonicalId);
    if (!item) {
      item = {
        canonicalId: line.canonicalId,
        displayName: line.displayName,
        aisle: line.aisle,
        isImprecise: line.isImprecise,
        amounts: [],
        display: "",
        sources: [],
      };
      byIngredient.set(line.canonicalId, item);
      totals.set(line.canonicalId, new Map());
    }

    if (!item.sources.some((s) => s.mealId === line.sourceMealId)) {
      item.sources.push({ mealId: line.sourceMealId, label: line.sourceMealLabel });
    }

    // Step 4: imprecise ingredients carry no quantity at all.
    if (item.isImprecise) continue;

    // Step 2: scale to planned servings, then convert to the base unit.
    const scaled = scaleForServings(line.quantity, line.recipeServes, line.plannedServings);
    const base = toBase(scaled, line.unit, line.origin);
    if (base.family === "IMPRECISE") continue;

    // Step 3: sum within a family; families stay separate.
    const key = familyKey(base.family, base.unit);
    const bucket = totals.get(line.canonicalId)!;
    const existing = bucket.get(key);
    if (existing) {
      existing.quantity += base.quantity;
    } else {
      bucket.set(key, {
        family: base.family,
        quantity: base.quantity,
        unit: base.unit,
        display: "",
      });
    }
  }

  const out: ConsolidatedItem[] = [];
  for (const item of byIngredient.values()) {
    const bucket = totals.get(item.canonicalId)!;
    item.amounts = [...bucket.values()]
      .map((a) => ({ ...a, display: formatAmount(a) }))
      .filter((a) => a.quantity > 0)
      // Mass and volume read first; counts after.
      .sort((a, b) => familyRank(a.family) - familyRank(b.family));

    item.display = item.isImprecise ? "" : item.amounts.map((a) => a.display).join(" + ");
    out.push(item);
  }

  return out;
}

function familyRank(f: UnitFamily): number {
  return f === "MASS" ? 0 : f === "VOLUME" ? 1 : f === "COUNT" ? 2 : 3;
}

export interface AisleGroup<T extends ConsolidatedItem = ConsolidatedItem> {
  aisle: Aisle;
  label: string;
  items: T[];
}

/**
 * Group into supermarket sections so the shop is one pass, not a zigzag.
 * Generic so callers can carry extra per-item state (checked, isManual)
 * through grouping without losing its type.
 */
export function groupByAisle<T extends ConsolidatedItem>(
  items: T[],
  order: Aisle[] = AISLE_ORDER,
): AisleGroup<T>[] {
  const groups = new Map<Aisle, T[]>();
  for (const item of items) {
    const list = groups.get(item.aisle) ?? [];
    list.push(item);
    groups.set(item.aisle, list);
  }

  return order
    .filter((aisle) => groups.has(aisle))
    .map((aisle) => ({
      aisle,
      label: AISLE_LABEL[aisle],
      items: groups.get(aisle)!.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    }));
}
