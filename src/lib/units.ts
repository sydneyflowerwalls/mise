/**
 * Unit handling for mise.
 *
 * This file does arithmetic. Claude never does — it extracts structure
 * ("2", "tbsp", "olive oil") and code does the maths (integration brief §6,
 * rule 2). A wrong quantity here is a bad shop.
 *
 * The Australian trap, stated plainly:
 *   - An Australian tablespoon is 20ml.
 *   - Almost every imported US or UK recipe means 15ml.
 *   - A teaspoon is 5ml everywhere.
 *   - An AU/UK cup is 250ml; a US cup is 240ml.
 * Convert on import using the recipe's recorded origin, or you are quietly
 * one third over on every tablespoon in the book.
 */

export type UnitFamily = "MASS" | "VOLUME" | "COUNT" | "IMPRECISE";
export type Origin = "AU" | "US" | "UK" | "OTHER";

/** Base units: grams for MASS, millilitres for VOLUME. */
export const BASE_UNIT: Record<Exclude<UnitFamily, "COUNT" | "IMPRECISE">, string> = {
  MASS: "g",
  VOLUME: "ml",
};

const MASS: Record<string, number> = {
  mg: 0.001,
  g: 1,
  gram: 1,
  grams: 1,
  gm: 1,
  kg: 1000,
  kilo: 1000,
  kilos: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
};

/** Volume units whose size does not vary by country. */
const VOLUME_FIXED: Record<string, number> = {
  ml: 1,
  millilitre: 1,
  millilitres: 1,
  milliliter: 1,
  milliliters: 1,
  cc: 1,
  l: 1000,
  litre: 1000,
  litres: 1000,
  liter: 1000,
  liters: 1000,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
};

/** Volume units that DO vary by country. This table is the whole point. */
const VOLUME_BY_ORIGIN: Record<string, Record<Origin, number>> = {
  tbsp: { AU: 20, US: 15, UK: 15, OTHER: 15 },
  tablespoon: { AU: 20, US: 15, UK: 15, OTHER: 15 },
  tablespoons: { AU: 20, US: 15, UK: 15, OTHER: 15 },
  dsp: { AU: 10, US: 10, UK: 10, OTHER: 10 },
  cup: { AU: 250, US: 240, UK: 250, OTHER: 250 },
  cups: { AU: 250, US: 240, UK: 250, OTHER: 250 },
  "fl oz": { AU: 30, US: 29.5735, UK: 28.4131, OTHER: 29.5735 },
  floz: { AU: 30, US: 29.5735, UK: 28.4131, OTHER: 29.5735 },
};

/** Counted nouns. Kept as counts — never silently converted to mass. */
const COUNT = new Set([
  "each", "whole", "piece", "pieces", "clove", "cloves", "bunch", "bunches",
  "tin", "tins", "can", "cans", "packet", "packets", "pack", "packs",
  "slice", "slices", "sprig", "sprigs", "stalk", "stalks", "stick", "sticks",
  "head", "heads", "punnet", "punnets", "rasher", "rashers", "fillet",
  "fillets", "sheet", "sheets", "jar", "jars", "bottle", "bottles", "egg",
  "eggs", "leaf", "leaves", "ear", "ears",
]);

/**
 * Never summed. These become a plain check-item with no quantity, and are
 * suppressed entirely when the pantry says we have them (product brief §6.2,
 * step 4).
 */
const IMPRECISE = new Set([
  "pinch", "pinches", "handful", "handfuls", "dash", "dashes", "splash",
  "splashes", "drizzle", "glug", "knob", "sprinkle", "to taste", "for frying",
  "for serving", "to serve", "for garnish", "as needed", "as required",
  "some", "few",
]);

/** Lowercase, strip punctuation and pluralising noise for table lookup. */
export function normaliseUnit(raw: string | null | undefined): string {
  if (!raw) return "each";
  return raw
    .toLowerCase()
    .trim()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

export function unitFamily(raw: string | null | undefined): UnitFamily {
  const u = normaliseUnit(raw);
  if (u in MASS) return "MASS";
  if (u in VOLUME_FIXED || u in VOLUME_BY_ORIGIN) return "VOLUME";
  if (IMPRECISE.has(u)) return "IMPRECISE";
  if (COUNT.has(u)) return "COUNT";
  // An unrecognised unit is a counted noun ("2 corn cobs"), not an error.
  return "COUNT";
}

export interface BaseAmount {
  family: UnitFamily;
  /** Grams for MASS, millilitres for VOLUME, the count for COUNT, 0 for IMPRECISE. */
  quantity: number;
  /** For COUNT, the noun being counted ("clove"). Otherwise the base unit. */
  unit: string;
}

/**
 * Convert one written amount into its base unit, using the recipe's origin to
 * resolve country-varying units.
 */
export function toBase(
  quantity: number | null | undefined,
  rawUnit: string | null | undefined,
  origin: Origin = "AU",
): BaseAmount {
  const u = normaliseUnit(rawUnit);
  const family = unitFamily(u);

  if (family === "IMPRECISE") {
    return { family, quantity: 0, unit: u };
  }

  const qty = quantity ?? 1;

  if (family === "MASS") {
    return { family, quantity: qty * MASS[u], unit: "g" };
  }

  if (family === "VOLUME") {
    const factor = u in VOLUME_FIXED ? VOLUME_FIXED[u] : VOLUME_BY_ORIGIN[u][origin];
    return { family, quantity: qty * factor, unit: "ml" };
  }

  // COUNT — normalise the noun to singular for grouping ("cloves" -> "clove").
  return { family, quantity: qty, unit: singular(u) };
}

function singular(noun: string): string {
  if (noun === "each" || noun === "whole") return "whole";
  if (noun === "leaves") return "leaf";
  if (noun.endsWith("ches") || noun.endsWith("shes")) return noun.slice(0, -2);
  if (noun.endsWith("s") && !noun.endsWith("ss")) return noun.slice(0, -1);
  return noun;
}

function plural(noun: string, n: number): string {
  if (n === 1 || noun === "whole") return noun;
  if (noun === "leaf") return "leaves";
  if (noun.endsWith("ch") || noun.endsWith("sh") || noun.endsWith("s")) return `${noun}es`;
  return `${noun}s`;
}

/** Trim float noise from repeated scaling without pretending to more precision. */
function tidy(n: number, dp: number): number {
  return Math.round(n * 10 ** dp) / 10 ** dp;
}

/**
 * Render a base amount the way a shopper reads it: 450g, 1.2kg, 250ml, 1.5L,
 * "2 whole", "3 cloves".
 */
export function formatAmount(amount: BaseAmount): string {
  const { family, quantity, unit } = amount;

  if (family === "IMPRECISE") return "";

  if (family === "MASS") {
    if (quantity >= 1000) return `${tidy(quantity / 1000, 2)}kg`;
    return `${tidy(quantity, quantity < 10 ? 1 : 0)}g`;
  }

  if (family === "VOLUME") {
    if (quantity >= 1000) return `${tidy(quantity / 1000, 2)}L`;
    return `${tidy(quantity, quantity < 10 ? 1 : 0)}ml`;
  }

  const n = tidy(quantity, 2);
  return `${n} ${plural(unit, n)}`;
}

/**
 * Scale a recipe quantity to the servings actually planned. Recipe serves 4,
 * the slot is set to 6, everything multiplies by 1.5.
 */
export function scaleForServings(
  quantity: number | null | undefined,
  recipeServes: number,
  plannedServings: number,
): number | null {
  if (quantity == null) return null;
  if (!recipeServes || recipeServes <= 0) return quantity;
  return quantity * (plannedServings / recipeServes);
}
