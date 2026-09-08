import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-sm border border-white/70 bg-cream/85 shadow-soft backdrop-blur-sm",
        "transition-shadow duration-200 ease-out",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
