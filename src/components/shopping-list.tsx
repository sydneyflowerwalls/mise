"use client";

import { Check, Info } from "lucide-react";
import { useState } from "react";

import type { AisleGroup } from "@/lib/consolidate";
import type { ShoppingItemView } from "@/lib/plan-queries";
import { cn } from "@/lib/cn";

/**
 * Ticked items grey out and drop to the bottom of their section rather than
 * vanishing (§6.1) — so you can see what you have already picked up, and untick
 * something you put back.
 */
export function ShoppingList({ groups }: { groups: AisleGroup<ShoppingItemView>[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      groups.flatMap((g) => g.items.map((i) => [i.canonicalId, i.checked])),
    ),
  );

  const toggle = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-7">
      {groups.map((group, gi) => {
        const items = [...group.items].sort((a, b) => {
          const ac = checked[a.canonicalId] ? 1 : 0;
          const bc = checked[b.canonicalId] ? 1 : 0;
          return ac - bc || a.displayName.localeCompare(b.displayName);
        });

        return (
          <section
            key={group.aisle}
            className="rise-in"
            style={{ animationDelay: `${gi * 80}ms` }}
          >
            <h2 className="mb-2 px-1 font-mono text-xs uppercase tracking-widest text-ink-soft">
              {group.label}
            </h2>
            <ul className="overflow-hidden rounded-sm border border-white/70 bg-cream/80 shadow-soft">
              {items.map((item) => (
                <ShoppingRow
                  key={item.canonicalId}
                  item={item}
                  checked={Boolean(checked[item.canonicalId])}
                  onToggle={() => toggle(item.canonicalId)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ShoppingRow({
  item,
  checked,
  onToggle,
}: {
  item: ShoppingItemView;
  checked: boolean;
  onToggle: () => void;
}) {
  const [showWhy, setShowWhy] = useState(false);

  return (
    <li className="border-b border-white/60 last:border-b-0">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={checked}
          className={cn(
            "flex min-h-14 flex-1 items-center gap-3 px-3 text-left transition-colors duration-200 ease-out",
            checked ? "opacity-45" : "hover:bg-white/50",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
              checked ? "border-lilac bg-lilac text-cloud" : "border-lilac/50 bg-white/70",
            )}
          >
            {checked && <Check className="size-4" strokeWidth={3} />}
          </span>

          <span className="min-w-0 flex-1">
            <span className={cn("block truncate font-semibold", checked && "line-through")}>
              {item.displayName}
            </span>
          </span>

          {/* "2 whole + 150g" — families kept separate, never merged into a lie. */}
          {item.display && (
            <span
              className={cn(
                "shrink-0 font-mono text-sm tabular-nums text-ink-soft",
                checked && "line-through",
              )}
            >
              {item.display}
            </span>
          )}
        </button>

        {item.sources.length > 0 && (
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            aria-expanded={showWhy}
            aria-label={`Why is ${item.displayName} on the list?`}
            className="flex w-11 items-center justify-center text-ink-soft transition-colors duration-200 hover:bg-white/50 hover:text-lilac-deep"
          >
            <Info className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {showWhy && item.sources.length > 0 && (
        <p className="bg-white/45 px-3 pb-3 pt-1 text-xs text-ink-soft">
          For {item.sources.map((s) => s.label).join(", ")}
        </p>
      )}
    </li>
  );
}
