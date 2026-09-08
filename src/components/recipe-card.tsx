"use client";

import { Plus, Star, X } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";

export interface RecipeCardData {
  id: string;
  title: string;
  author: string | null;
  status: "NEW" | "FAVOURITE" | "DISLIKED" | "FILED";
}

/**
 * The card shows title and author only (§4.3) — deliberately sparse, so a
 * long library stays scannable on a phone. Everything else is one tap away.
 */
export function RecipeCard({ recipe, index }: { recipe: RecipeCardData; index: number }) {
  return (
    <article
      className="rise-in flex items-stretch overflow-hidden rounded-sm border border-white/70 bg-cream/85 shadow-soft transition-shadow duration-200 hover:shadow-lift"
      style={{ animationDelay: `${Math.min(index, 12) * 80}ms` }}
    >
      <Link href={`/recipes/${recipe.id}`} className="min-w-0 flex-1 px-4 py-3.5">
        <h2 className="truncate text-base font-semibold leading-snug">{recipe.title}</h2>
        {recipe.author && (
          <p className="truncate text-sm text-ink-soft">{recipe.author}</p>
        )}
      </Link>

      <div className="flex shrink-0 items-center gap-0.5 pr-2">
        <CardAction label={`Add ${recipe.title} to the plan`}>
          <Plus className="size-[18px]" aria-hidden="true" />
        </CardAction>
        <CardAction
          label={`Mark ${recipe.title} as a favourite`}
          active={recipe.status === "FAVOURITE"}
          activeClass="text-lilac-deep"
        >
          <Star
            className="size-[18px]"
            fill={recipe.status === "FAVOURITE" ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </CardAction>
        <CardAction
          label={`Mark ${recipe.title} as disliked`}
          active={recipe.status === "DISLIKED"}
          activeClass="text-ink"
        >
          <X className="size-[18px]" aria-hidden="true" />
        </CardAction>
      </div>
    </article>
  );
}

function CardAction({
  label,
  children,
  active = false,
  activeClass = "",
}: {
  label: string;
  children: React.ReactNode;
  active?: boolean;
  activeClass?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-11 items-center justify-center rounded-full transition-colors duration-200 ease-out",
        "text-ink-soft hover:bg-white/70 hover:text-ink active:translate-y-px",
        active && activeClass,
      )}
    >
      {children}
    </button>
  );
}
