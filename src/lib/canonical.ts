/**
 * Resolving a written ingredient line to a canonical ingredient.
 *
 * The order matters and is the difference between staying inside the Pro plan
 * and hitting rate walls every Sunday (integration brief §6, rule 1):
 *
 *   1. Normalise the raw string to a lookup key.
 *   2. Hit the alias table. This is the steady state — after the first few
 *      weeks, essentially every lookup lands here and costs a query.
 *   3. Only on a miss, ask Claude — then WRITE THE MAPPING BACK, so the same
 *      string is never resolved twice.
 *   4. If Claude is unavailable, store the raw string unresolved rather than
 *      failing. The user can map it later; food never silently vanishes from
 *      the shopping list.
 */

import "server-only";
import { z } from "zod";

import { oneShot } from "@/lib/claude/one-shot";
import { aliasKey } from "@/lib/alias-key";
import { db } from "@/lib/db";

const AISLES = [
  "PRODUCE", "MEAT_SEAFOOD", "DELI", "DAIRY_EGGS", "BAKERY",
  "PANTRY", "FREEZER", "DRINKS", "HOUSEHOLD", "OTHER",
] as const;

const ClassificationSchema = z.object({
  canonicalName: z.string().min(1).max(60),
  aisle: z.enum(AISLES),
  isImprecise: z.boolean(),
});

const SYSTEM_PROMPT = `You map written recipe ingredients to canonical pantry names for an Australian household shopping list.

Rules:
- canonicalName is the shortest name a shopper would recognise on a list: "brown onion, finely diced" -> "onion"; "free-range chicken thigh fillets" -> "chicken thigh".
- Use Australian supermarket naming (capsicum not bell pepper, coriander not cilantro, rocket not arugula, mince not ground beef).
- Singular, lowercase, no quantities, no preparation words.
- aisle is where it sits in an Australian supermarket.
- isImprecise is true only for things never bought by a measured amount for a recipe: salt, pepper, cooking oil for frying, water.

Reply with only a JSON object: {"canonicalName": string, "aisle": string, "isImprecise": boolean}`;

export interface ResolvedIngredient {
  canonicalIngredientId: string | null;
  /** How it was resolved — useful for a "review these" screen later. */
  via: "alias" | "claude" | "unresolved";
}

/**
 * Resolve one raw ingredient name, consulting Claude only on a genuine miss.
 */
export async function resolveIngredient(rawName: string): Promise<ResolvedIngredient> {
  const key = aliasKey(rawName);
  if (!key) return { canonicalIngredientId: null, via: "unresolved" };

  const hit = await db.ingredientAlias.findUnique({ where: { key } });
  if (hit) return { canonicalIngredientId: hit.canonicalIngredientId, via: "alias" };

  const result = await oneShot({
    systemPrompt: SYSTEM_PROMPT,
    prompt: rawName,
    schema: ClassificationSchema,
    model: "sonnet",
    timeoutMs: 20_000,
  });

  // Degrade, never fail: an unresolved ingredient still reaches the shopping
  // list under its raw name (integration brief §7).
  if (!result.ok) return { canonicalIngredientId: null, via: "unresolved" };

  const { canonicalName, aisle, isImprecise } = result.data;

  const canonical = await db.canonicalIngredient.upsert({
    where: { name: canonicalName },
    create: { name: canonicalName, aisle, isImprecise },
    update: {},
  });

  // The write-back. Without this line the whole design is pointless.
  await db.ingredientAlias.upsert({
    where: { key },
    create: { key, canonicalIngredientId: canonical.id, source: "claude" },
    update: {},
  });

  return { canonicalIngredientId: canonical.id, via: "claude" };
}

/** Resolve many lines, de-duplicating identical keys within the batch. */
export async function resolveIngredients(
  rawNames: string[],
): Promise<Map<string, ResolvedIngredient>> {
  const unique = [...new Set(rawNames)];
  const out = new Map<string, ResolvedIngredient>();
  for (const name of unique) {
    out.set(name, await resolveIngredient(name));
  }
  return out;
}
