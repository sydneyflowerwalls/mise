"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createRecipe, type CreateRecipeState } from "@/app/recipes/actions";

const FIELD =
  "w-full rounded-[14px] border border-white/80 bg-white/75 px-3 py-2.5 text-base " +
  "placeholder:text-ink-soft/60 focus:border-lilac focus:outline-none";

const LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft";

let nextRowId = 0;

export function RecipeForm() {
  const [state, action, pending] = useActionState<CreateRecipeState, FormData>(
    createRecipe,
    {},
  );
  const [rows, setRows] = useState(() => [0, 1, 2].map(() => nextRowId++));

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="rowCount" value={rows.length} />

      <Card className="space-y-4 p-4">
        <div>
          <label className={LABEL} htmlFor="title">Title</label>
          <input id="title" name="title" required className={FIELD} placeholder="Beef massaman" />
        </div>

        <div>
          <label className={LABEL} htmlFor="author">Author or chef</label>
          <input id="author" name="author" className={FIELD} placeholder="Adam Liaw" />
        </div>

        {/* Asymmetric, not three equal columns — per the design spec. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
          <div>
            <label className={LABEL} htmlFor="serves">Serves</label>
            <input id="serves" name="serves" type="number" min={1} max={50} defaultValue={4} className={FIELD} />
          </div>
          <div>
            <label className={LABEL} htmlFor="prepMinutes">Prep (min)</label>
            <input id="prepMinutes" name="prepMinutes" type="number" min={0} className={FIELD} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={LABEL} htmlFor="cookMinutes">Cook (min)</label>
            <input id="cookMinutes" name="cookMinutes" type="number" min={0} className={FIELD} />
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="origin">Recipe origin</label>
          <select id="origin" name="origin" defaultValue="AU" className={FIELD}>
            <option value="AU">Australian (tablespoon = 20ml)</option>
            <option value="US">American (tablespoon = 15ml)</option>
            <option value="UK">British (tablespoon = 15ml)</option>
            <option value="OTHER">Other / unknown (assumes 15ml)</option>
          </select>
          <p className="mt-1.5 text-xs text-ink-soft">
            Decides how tablespoons and cups convert. Getting this wrong is a
            third off every tablespoon in the recipe.
          </p>
        </div>
      </Card>

      <section>
        <h2 className="mb-2 px-1 text-lg">Ingredients</h2>
        <Card className="divide-y divide-white/60">
          {rows.map((rowId, i) => (
            <div key={rowId} className="grid grid-cols-[4.5rem_5rem_1fr_2.75rem] gap-2 p-3">
              <input
                name={`ing.${i}.quantity`}
                className={FIELD}
                placeholder="2"
                inputMode="decimal"
                aria-label={`Quantity for ingredient ${i + 1}`}
              />
              <input
                name={`ing.${i}.unit`}
                className={FIELD}
                placeholder="tbsp"
                aria-label={`Unit for ingredient ${i + 1}`}
              />
              <input
                name={`ing.${i}.name`}
                className={FIELD}
                placeholder="brown onion"
                aria-label={`Ingredient ${i + 1}`}
              />
              <button
                type="button"
                onClick={() => setRows((r) => r.filter((id) => id !== rowId))}
                disabled={rows.length === 1}
                aria-label={`Remove ingredient ${i + 1}`}
                className="flex items-center justify-center rounded-[14px] text-ink-soft transition-colors duration-200 hover:bg-white/70 hover:text-ink disabled:opacity-30"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
              <input
                name={`ing.${i}.note`}
                className={`${FIELD} col-span-4`}
                placeholder="finely diced (optional)"
                aria-label={`Note for ingredient ${i + 1}`}
              />
            </div>
          ))}
        </Card>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3 w-full"
          onClick={() => setRows((r) => [...r, nextRowId++])}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add ingredient
        </Button>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-lg">Method</h2>
        <Card className="p-4">
          <label className={LABEL} htmlFor="method">One step per line</label>
          <textarea id="method" name="method" rows={8} className={FIELD} />
        </Card>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-lg">Notes</h2>
        <Card className="p-4">
          <textarea
            name="notes"
            rows={3}
            className={FIELD}
            placeholder="Halve the chilli. Good with rice, not noodles."
            aria-label="Personal notes"
          />
        </Card>
      </section>

      {state.error && (
        <p role="alert" className="rounded-sm bg-white/80 px-4 py-3 text-sm font-semibold text-ink">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save recipe"}
      </Button>
    </form>
  );
}
