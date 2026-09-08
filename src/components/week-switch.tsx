"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Two views, no timer (§5.2). On Sunday at 00:00 next week silently becomes
 * this week because the dates say so — see week.ts.
 */
export function WeekSwitch({ current }: { current: "this" | "next" }) {
  const tabs = [
    { key: "this", label: "This week", href: "/plan" },
    { key: "next", label: "Next week", href: "/plan?week=next" },
  ] as const;

  return (
    <div
      role="tablist"
      aria-label="Which week"
      className="flex gap-1 rounded-sm border border-white/70 bg-white/45 p-1"
    >
      {tabs.map((tab) => {
        const active = current === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "flex-1 rounded-[14px] px-4 py-2.5 text-center text-sm font-semibold",
              "transition-colors duration-200 ease-out",
              active ? "bg-lilac text-ink shadow-soft" : "text-ink-soft hover:bg-white/60",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
