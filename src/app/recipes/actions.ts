"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { aliasKey } from "@/lib/alias-key";
import { resolveIngredient } from "@/lib/canonical";
import { db } from "@/lib/db";

const IngredientInput = z.object({
  quantity: z.string(),
  unit: z.string(),
  name: z.string(),
  note: z.string(),
});

const RecipeInput = z.object({
  title: z.string().min(1, "A recipe needs a title."),
  author: z.string(),
  serves: z.coerce.number().int().min(1).max(50),
  prepMinutes: z.string(),
  cookMinutes: z.string(),
  origin: z.enum(["AU", "US", "UK", "OTHER"]),
  notes: z.string(),
  method: z.string(),
  ingredients: z.array(IngredientInput),
});

function optionalInt(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function optionalDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Accept "1 1/2" and "3/4" as well as "1.5" — recipes are written by humans.
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

export type CreateRecipeState = { error?: string };

export async function createRecipe(
  _prev: CreateRecipeState,
  formData: FormData,
): Promise<CreateRecipeState> {
  const rows = Number(formData.get("rowCount") ?? 0);
  const ingredients = Array.from({ length: rows }, (_, i) => ({
    quantity: String(formData.get(`ing.${i}.quantity`) ?? ""),
    unit: String(formData.get(`ing.${i}.unit`) ?? ""),
    name: String(formData.get(`ing.${i}.name`) ?? ""),
    note: String(formData.get(`ing.${i}.note`) ?? ""),
  })).filter((r) => r.name.trim());

  const parsed = RecipeInput.safeParse({
    title: String(formData.get("title") ?? ""),
    author: String(formData.get("author") ?? ""),
    serves: String(formData.get("serves") ?? "4"),
    prepMinutes: String(formData.get("prepMinutes") ?? ""),
    cookMinutes: String(formData.get("cookMinutes") ?? ""),
    origin: String(formData.get("origin") ?? "AU"),
    notes: String(formData.get("notes") ?? ""),
    method: String(formData.get("method") ?? ""),
    ingredients,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Something in that form didn't look right." };
  }

  const data = parsed.data;

  const recipe = await db.recipe.create({
    data: {
      title: data.title.trim(),
      author: data.author.trim() || null,
      serves: data.serves,
      prepMinutes: optionalInt(data.prepMinutes),
      cookMinutes: optionalInt(data.cookMinutes),
      origin: data.origin,
      notes: data.notes.trim() || null,
      // Blank lines are paragraph breaks in a pasted method, not steps.
      method: data.method.split("\n").map((s) => s.trim()).filter(Boolean),
      titleKey: aliasKey(data.title),
      sourceType: "OWN",
      ingredients: {
        create: data.ingredients.map((ing, position) => ({
          position,
          rawText: [ing.quantity, ing.unit, ing.name, ing.note].filter(Boolean).join(" ").trim(),
          quantity: optionalDecimal(ing.quantity),
          unit: ing.unit.trim() || null,
          note: ing.note.trim() || null,
        })),
      },
    },
    include: { ingredients: true },
  });

  // Canonicalisation runs after the save, never blocking it. A Claude outage
  // must not stop someone entering a recipe (integration brief §7).
  for (const ing of recipe.ingredients) {
    const name = data.ingredients[ing.position]?.name ?? ing.rawText;
    const resolved = await resolveIngredient(name);
    if (resolved.canonicalIngredientId) {
      await db.recipeIngredient.update({
        where: { id: ing.id },
        data: { canonicalIngredientId: resolved.canonicalIngredientId },
      });
    }
  }

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function setRecipeStatus(
  id: string,
  status: "NEW" | "FAVOURITE" | "DISLIKED" | "FILED",
) {
  await db.recipe.update({ where: { id }, data: { status } });
  revalidatePath("/recipes");
}
