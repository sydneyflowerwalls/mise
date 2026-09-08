/**
 * Decorative sparkles and clouds. Inline SVG rather than emoji (the spec
 * forbids emoji in UI) and rather than external images (no broken links).
 * All are aria-hidden — they carry no meaning.
 */

export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 0c.6 5.7 5.7 10.8 12 12-6.3 1.2-11.4 6.3-12 12-.6-5.7-5.7-10.8-12-12C6.3 10.8 11.4 5.7 12 0Z" />
    </svg>
  );
}

export function Cloud({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" className={className} aria-hidden="true" fill="currentColor">
      <path d="M30 52c-12 0-22-8-22-18S18 16 30 16c3 0 6 .6 8 2 5-9 15-15 26-15 16 0 29 12 30 27 9 1 16 8 16 16 0 3-1 5-2 6H30Z" />
    </svg>
  );
}

/** Soft ambient decoration for the top of a screen. */
export function HeaderDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <Cloud className="absolute -right-6 -top-3 w-28 text-white/55" />
      <Cloud className="absolute left-1/3 top-6 w-16 text-white/35" />
      <Sparkle className="absolute right-10 top-9 w-4 text-sky" />
      <Sparkle className="absolute right-24 top-4 w-2.5 text-mint" />
      <Sparkle className="absolute left-6 top-10 w-3 text-cream" />
    </div>
  );
}
