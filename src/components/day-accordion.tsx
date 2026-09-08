"use client";

import { ChevronDown, Plus, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/cn";
import { DAY_LABEL, DAY_SHORT, type DayCode } from "@/lib/week";

const SLOTS = ["BREAKFAST", "LUNCH", "DINNER"] as const;
type Slot = (typeof SLOTS)[number];

const SLOT_LABEL: Record<Slot, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

export interface PlannedMealView {
  id: string;
  freeText: string | null;
  servings: number;
  recipe: { id: string; title: string; author: string | null } | null;
}

/**
 * Collapsed: day, date, and a one-line summary of what's planned. Expanded:
 * the three slots (§5.1). Accordion rather than a grid because seven days by
 * three slots does not fit a phone.
 */
export function DayAccordion({
  day,
  date,
  today,
  index,
  meals,
}: {
  day: DayCode;
  date: Date;
  today: boolean;
  index: number;
  meals: Record<Slot, PlannedMealView | null>;
}) {
  const [open, setOpen] = useState(today);

  const filled = SLOTS.map((s) => meals[s]).filter(Boolean) as PlannedMealView[];
  const summary =
    filled.length === 0
      ? "Nothing planned"
      : filled.map((m) => m.recipe?.title ?? m.freeText).join(" · ");

  return (
    <section
      className={cn(
        "rise-in overflow-hidden rounded-sm border bg-cream/80 shadow-soft",
        today ? "border-lilac/70 ring-2 ring-lilac/30" : "border-white/70",
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-white/45"
      >
        <span className="flex w-12 shrink-0 flex-col items-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {DAY_SHORT[day]}
          </span>
          <span className={cn("font-mono text-lg leading-none", today && "text-lilac-deep")}>
            {date.getDate()}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{DAY_LABEL[day]}</span>
          <span className="block truncate text-sm text-ink-soft">{summary}</span>
        </span>

        {today && (
          <span className="shrink-0 rounded-full bg-lilac px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-ink">
            Today
          </span>
        )}

        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-ink-soft transition-transform duration-200 ease-out",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul className="border-t border-white/60 bg-white/35">
          {SLOTS.map((slot) => (
            <li key={slot} className="border-b border-white/60 last:border-b-0">
              <SlotRow day={day} slot={slot} meal={meals[slot]} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SlotRow({ day, slot, meal }: { day: DayCode; slot: Slot; meal: PlannedMealView | null }) {
  if (!meal) {
    return (
      <button
        type="button"
        className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-ink-soft transition-colors duration-200 hover:bg-white/60 hover:text-ink"
        aria-label={`Add ${SLOT_LABEL[slot].toLowerCase()} for ${DAY_LABEL[day]}`}
      >
        <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide">
          {SLOT_LABEL[slot]}
        </span>
        <Plus className="size-4" aria-hidden="true" />
        <span className="text-sm">Add</span>
      </button>
    );
  }

  return (
    <div className="flex min-h-14 items-center gap-3 px-4">
      <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {SLOT_LABEL[slot]}
      </span>
      <span className="min-w-0 flex-1 py-2">
        <span className="block truncate font-semibold">
          {meal.recipe?.title ?? meal.freeText}
        </span>
        {meal.recipe?.author && (
          <span className="block truncate text-xs text-ink-soft">{meal.recipe.author}</span>
        )}
      </span>
      <span className="shrink-0 font-mono text-xs text-ink-soft">×{meal.servings}</span>
      <button
        type="button"
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors duration-200 hover:bg-white/70 hover:text-ink"
        aria-label={`Remove ${meal.recipe?.title ?? meal.freeText} from ${DAY_LABEL[day]} ${SLOT_LABEL[slot].toLowerCase()}`}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
