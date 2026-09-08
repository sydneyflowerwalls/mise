import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "soft";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  /**
   * Accent fill with charcoal text — 4.85:1, passes AA. The spec's front
   * matter pairs pale pink with baby blue (~1.1:1); its prose says "accent
   * color fill", which is what is built here. See globals.css.
   */
  primary:
    "bg-lilac text-ink shadow-soft hover:bg-lilac-deep hover:text-cloud hover:shadow-lift active:translate-y-px active:shadow-press",
  ghost:
    "border-[1.5px] border-lilac/60 text-ink bg-transparent hover:bg-lilac/15",
  soft:
    "bg-cream text-ink shadow-soft hover:bg-cloud hover:shadow-lift active:translate-y-px",
};

const SIZES: Record<Size, string> = {
  // 44px minimum height throughout — this is used one-handed in an aisle.
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-7 text-lg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-sm font-semibold",
        "transition-[background-color,box-shadow,transform,color] duration-200 ease-out",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
