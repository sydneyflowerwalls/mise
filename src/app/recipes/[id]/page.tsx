import { Clock, ExternalLink, Users } from "lucide-react";
import { notFound } from "next/navigation";

import { Screen } from "@/components/screen";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatAmount, toBase, type Origin } from "@/lib/units";

export const dynamic = "force-dynamic";

function speedTag(prep: number | null, cook: number | null): string | null {
  // Arithmetic, never an LLM guess (integration brief §6).
  if (prep == null && cook == null) return null;
  const total = (prep ?? 0) + (cook ?? 0);
  if (total <= 30) return "Under 30 min";
  if (total <= 60) return "30–60 min";
  return "Over an hour";
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await db.recipe.findUnique({
    where: { id },
    include: { ingredients: { orderBy: { position: "asc" } } },
  });

  if (!recipe) notFound();

  const total = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const speed = speedTag(recipe.prepMinutes, recipe.cookMinutes);

  return (
    <Screen title={recipe.title} subtitle={recipe.author ?? undefined}>
      <div className="mb-5 flex flex-wrap gap-2">
        <Meta icon={<Users className="size-3.5" aria-hidden="true" />} label={`Serves ${recipe.serves}`} />
        {total > 0 && (
          <Meta icon={<Clock className="size-3.5" aria-hidden="true" />} label={`${total} min`} />
        )}
        {speed && <Meta label={speed} />}
        {recipe.timesCooked > 0 && <Meta label={`Cooked ${recipe.timesCooked}×`} />}
      </div>

      <section className="mb-5">
        <h2 className="mb-2 px-1 text-lg">Ingredients</h2>
        <Card>
          <ul className="divide-y divide-white/60">
            {recipe.ingredients.map((ing) => {
              const qty = ing.quantity ? Number(ing.quantity) : null;
              const base = toBase(qty, ing.unit, recipe.origin as Origin);
              const shown = qty != null ? formatAmount(base) : "";
              return (
                <li key={ing.id} className="flex items-baseline gap-3 px-4 py-3">
                  <span className="w-24 shrink-0 font-mono text-sm tabular-nums text-ink-soft">
                    {shown}
                  </span>
                  <span className="min-w-0 flex-1">
                    {ing.rawText}
                    {ing.note && (
                      <span className="block text-xs text-ink-soft">{ing.note}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      {recipe.method.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 px-1 text-lg">Method</h2>
          <Card className="p-4">
            <ol className="space-y-4">
              {recipe.method.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-lilac/30 font-mono text-sm">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      )}

      {recipe.notes && (
        <section className="mb-5">
          <h2 className="mb-2 px-1 text-lg">Notes</h2>
          <Card className="p-4 text-sm">{recipe.notes}</Card>
        </section>
      )}

      {recipe.sourceUrl && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 px-1 text-sm font-semibold text-lilac-deep underline underline-offset-4"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          View the original
        </a>
      )}
    </Screen>
  );
}

function Meta({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/65 px-3 py-1.5 text-xs font-semibold text-ink-soft">
      {icon}
      {label}
    </span>
  );
}
