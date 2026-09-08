/**
 * Seed the canonical ingredient table from src/data/canonical-ingredients.json.
 *
 * This is reference data, deliberately versioned in the repository rather than
 * typed into a database by hand: it changes rarely, benefits from review, and
 * every fresh environment should start from the same table. Re-running is safe
 * and non-destructive — existing rows and user-made mappings are left alone.
 *
 *   npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { aliasKey } from "../src/lib/alias-key";

// __dirname does not exist in ESM.
const here = dirname(fileURLToPath(import.meta.url));

interface SeedIngredient {
  name: string;
  aisle: string;
  isImprecise?: boolean;
  gramsPerUnit?: number;
  aliases?: string[];
}

const db = new PrismaClient();

async function main() {
  const raw = readFileSync(join(here, "..", "src", "data", "canonical-ingredients.json"), "utf8");
  const { ingredients } = JSON.parse(raw) as { ingredients: SeedIngredient[] };

  let created = 0;
  let aliasCount = 0;

  for (const entry of ingredients) {
    const canonical = await db.canonicalIngredient.upsert({
      where: { name: entry.name },
      create: {
        name: entry.name,
        aisle: entry.aisle as never,
        isImprecise: entry.isImprecise ?? false,
        gramsPerUnit: entry.gramsPerUnit ?? null,
      },
      // Aisle and imprecision may be corrected in the data file; adopt those.
      // gramsPerUnit likewise. The user's own aliases are never touched.
      update: {
        aisle: entry.aisle as never,
        isImprecise: entry.isImprecise ?? false,
        gramsPerUnit: entry.gramsPerUnit ?? null,
      },
    });
    created += 1;

    // The canonical name is itself a lookup key, plus every listed alias.
    const keys = new Set([entry.name, ...(entry.aliases ?? [])].map(aliasKey));
    for (const key of keys) {
      if (!key) continue;
      await db.ingredientAlias.upsert({
        where: { key },
        create: { key, canonicalIngredientId: canonical.id, source: "seed" },
        update: {},
      });
      aliasCount += 1;
    }
  }

  console.log(`Seeded ${created} canonical ingredients and ${aliasCount} alias keys.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
