"use client";

import { CalendarDays, CookingPot, ShoppingBasket, Package } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/plan", label: "Plan", Icon: CalendarDays },
  { href: "/recipes", label: "Recipes", Icon: CookingPot },
  { href: "/shopping", label: "Shopping", Icon: ShoppingBasket },
  { href: "/pantry", label: "Pantry", Icon: Package },
] as const;

/**
 * Bottom navigation, not a top bar: this is a phone app held one-handed, and
 * the bottom third of the screen is the only comfortable thumb reach.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-[100] border-t border-white/60 bg-blush/85 px-2 pt-2 backdrop-blur-lg"
      aria-label="Main"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-sm px-1 py-1.5",
                  "text-[0.7rem] font-medium transition-colors duration-200 ease-out",
                  active ? "bg-lilac/25 text-ink" : "text-ink-soft hover:bg-white/40",
                )}
              >
                <Icon
                  className={cn("size-5", active && "text-lilac-deep")}
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden="true"
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
