import { CookingPot, Plus } from "lucide-react";
import Link from "next/link";

import { RecipeCard } from "@/components/recipe-card";
import { EmptyState, Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "new", label: "New", status: "NEW" },
  { key: "favourites", label: "Favourites", status: "FAVOURITE" },
  { key: "all", label: "All", status: null },
  { key: "disliked", label: "Disliked", status: "DISLIKED" },
] as const;

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewParam } = await searchParams;
  const view = VIEWS.find((v) => v.key === viewParam) ?? VIEWS[2];

  const recipes = await db.recipe.findMany({
    where: view.status ? { status: view.status } : {},
    select: { id: true, title: true, author: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <Screen
      title="Recipes"
      subtitle={`${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"}`}
      action={
        <Link href="/recipes/new">
          <Button size="sm" aria-label="Add a recipe">
            <Plus className="size-4" aria-hidden="true" />
            Add
          </Button>
        </Link>
      }
    >
      {/* Folder-style views (§4.4). Horizontally scrollable, never wrapping. */}
      <nav
        aria-label="Recipe views"
        className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex w-max gap-2">
          {VIEWS.map((v) => (
            <li key={v.key}>
              <Link
                href={v.key === "all" ? "/recipes" : `/recipes?view=${v.key}`}
                aria-current={v.key === view.key ? "page" : undefined}
                className={cn(
                  "block rounded-sm px-4 py-2.5 text-sm font-semibold transition-colors duration-200",
                  v.key === view.key
                    ? "bg-lilac text-ink shadow-soft"
                    : "bg-white/50 text-ink-soft hover:bg-white/75",
                )}
              >
                {v.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {recipes.length === 0 ? (
        <EmptyState
          icon={<CookingPot className="size-7" aria-hidden="true" />}
          title={view.key === "all" ? "No recipes yet" : `Nothing in ${view.label}`}
          body={
            view.key === "all"
              ? "Add one by hand to get started. Importing from a URL arrives in phase 2."
              : "Recipes land here as you star them, cook them, or rule them out."
          }
          action={
            view.key === "all" ? (
              <Link href="/recipes/new">
                <Button>
                  <Plus className="size-4" aria-hidden="true" />
                  Add a recipe
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {recipes.map((recipe, i) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} index={i} />
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
