import "server-only";

import type { Aisle, ConsolidatedItem, PlanLine } from "@/lib/consolidate";
import { consolidate, groupByAisle } from "@/lib/consolidate";
import { db } from "@/lib/db";
import { DAY_SHORT, type DayCode, nextWeekStart, startOfWeek, toDateOnly } from "@/lib/week";
import type { Origin } from "@/lib/units";

/** A consolidated line plus the state that lives in the database. */
export interface ShoppingItemView extends ConsolidatedItem {
  checked: boolean;
  isManual: boolean;
}

/**
 * Get (or lazily create) a week. "This week" and "next week" are derived from
 * today's date, so the Sunday rollover needs no scheduled job — see week.ts.
 */
export async function getOrCreateWeek(which: "this" | "next") {
  const start = toDateOnly(which === "this" ? startOfWeek() : nextWeekStart());

  return db.week.upsert({
    where: { startDate: start },
    create: { startDate: start, status: which === "this" ? "CURRENT" : "NEXT" },
    update: {},
    include: {
      meals: {
        include: { recipe: { select: { id: true, title: true, author: true, serves: true } } },
      },
    },
  });
}

/**
 * Turn a week's planned meals into a consolidated, aisle-sorted shopping list.
 *
 * Derived from the plan on read rather than stored incrementally. That is what
 * makes "removing a recipe removes its ingredients" (§6.1) true by
 * construction instead of by remembering to write the delete path — the single
 * easiest thing to get wrong in this whole feature.
 *
 * Manual items and tick state live in the database and are merged on top.
 */
export async function buildShoppingList(weekStart: Date) {
  const meals = await db.plannedMeal.findMany({
    where: {
      weekStart,
      recipeId: { not: null },
      // A leftovers lunch eats yesterday's dinner. It must not shop for it again.
      leftoversForId: null,
    },
    include: {
      recipe: {
        include: {
          ingredients: { include: { canonicalIngredient: true }, orderBy: { position: "asc" } },
        },
      },
    },
  });

  const lines: PlanLine[] = [];

  for (const meal of meals) {
    if (!meal.recipe) continue;
    const label = `${DAY_SHORT[meal.day as DayCode]} ${meal.slot.toLowerCase()}`;

    for (const ing of meal.recipe.ingredients) {
      // Unresolved ingredients still belong on the list — under their raw name,
      // in Other. A missing canonical mapping must never silently drop food
      // from the shop (integration brief §7).
      const canonical = ing.canonicalIngredient;
      lines.push({
        canonicalId: canonical?.id ?? `raw:${ing.rawText.toLowerCase()}`,
        displayName: canonical?.name ?? ing.rawText,
        aisle: (canonical?.aisle ?? "OTHER") as Aisle,
        isImprecise: canonical?.isImprecise ?? false,
        quantity: ing.quantity ? Number(ing.quantity) : null,
        unit: ing.unit,
        origin: meal.recipe.origin as Origin,
        recipeServes: meal.recipe.serves,
        plannedServings: meal.servings,
        sourceMealId: meal.id,
        sourceMealLabel: label,
      });
    }
  }

  const generated = consolidate(lines);

  const list = await db.shoppingList.findUnique({
    where: { weekStart },
    include: { items: { include: { amounts: true } } },
  });

  const checked = new Set(
    (list?.items ?? []).filter((i) => i.checked).map((i) => i.canonicalIngredientId ?? i.displayName),
  );

  const manual = (list?.items ?? [])
    .filter((i) => i.isManual)
    .map((i) => ({
      canonicalId: i.id,
      displayName: i.displayName,
      aisle: i.aisle as Aisle,
      isImprecise: false,
      amounts: [],
      display: i.amounts[0] ? `${i.amounts[0].quantity} ${i.amounts[0].unit}` : "",
      sources: [],
      checked: i.checked,
      isManual: true,
    }));

  const items = generated.map((item) => ({
    ...item,
    checked: checked.has(item.canonicalId) || checked.has(item.displayName),
    isManual: false,
  }));

  return groupByAisle<ShoppingItemView>([...items, ...manual]);
}
