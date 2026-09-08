import type { ReactNode } from "react";
import { HeaderDecor } from "@/components/decor";

/**
 * Standard screen frame: decorated header, content column, and enough bottom
 * padding that the fixed nav never covers the last item in a list.
 */
export function Screen({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-28 lg:max-w-3xl">
      <header className="safe-top relative -mx-4 mb-5 overflow-hidden px-4 pb-6 pt-4">
        <HeaderDecor />
        <div className="relative flex items-end justify-between gap-3">
          <div>
            <h1 className="text-[2rem] leading-tight">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      </header>
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rise-in flex flex-col items-center rounded-md border border-white/60 bg-cream/60 px-6 py-12 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-white/70 text-lilac-deep">
        {icon}
      </div>
      <h2 className="text-lg">{title}</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
