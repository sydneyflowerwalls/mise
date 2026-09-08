/**
 * Week arithmetic. Weeks run Sunday 00:00 to Saturday 23:59 (product brief §5).
 *
 * There is no timer and no scheduled job: "this week" and "next week" are
 * derived from today's date every time they are asked for. On Sunday at 00:00
 * next week silently becomes this week, and a fresh blank next week opens,
 * because the arithmetic says so.
 */

export type DayCode = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

export const DAY_CODES: DayCode[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export const DAY_LABEL: Record<DayCode, string> = {
  SUN: "Sunday",
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
};

export const DAY_SHORT: Record<DayCode, string> = {
  SUN: "Sun", MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat",
};

/** Midnight local on the Sunday that starts the week containing `date`. */
export function startOfWeek(date: Date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay()); // getDay(): 0 = Sunday
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function nextWeekStart(date: Date = new Date()): Date {
  return addDays(startOfWeek(date), 7);
}

export function dayOfWeek(date: Date): DayCode {
  return DAY_CODES[date.getDay()];
}

export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * Fixed abbreviations rather than toLocaleDateString: en-AU renders September
 * as "Sept", and the header format is specified as "Sep". Also keeps the
 * header identical regardless of the host's ICU data.
 */
const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "Week of Sun 6 – Sat 12 Sep" — the live header from §5.1. */
export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const d = (x: Date) => x.getDate();
  const m = (x: Date) => MONTH_ABBR[x.getMonth()];
  const startPart =
    weekStart.getMonth() === end.getMonth()
      ? `Sun ${d(weekStart)}`
      : `Sun ${d(weekStart)} ${m(weekStart)}`;
  return `Week of ${startPart} – Sat ${d(end)} ${m(end)}`;
}

/** Postgres DATE columns are date-only; avoid timezone shifting them. */
export function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}
