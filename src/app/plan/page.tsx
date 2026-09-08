import { CalendarDays } from "lucide-react";

import { DayAccordion } from "@/components/day-accordion";
import { WeekSwitch } from "@/components/week-switch";
import { Screen } from "@/components/screen";
import { getOrCreateWeek } from "@/lib/plan-queries";
import {
  DAY_CODES,
  type DayCode,
  addDays,
  formatWeekRange,
  isToday,
  nextWeekStart,
  startOfWeek,
} from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const which = weekParam === "next" ? "next" : "this";

  const week = await getOrCreateWeek(which);
  const weekStart = which === "this" ? startOfWeek() : nextWeekStart();

  const byDaySlot = new Map(
    week.meals.map((m) => [`${m.day}:${m.slot}`, m] as const),
  );

  return (
    <Screen
      title={which === "this" ? "This week" : "Next week"}
      subtitle={formatWeekRange(weekStart)}
      action={<CalendarDays className="size-6 text-lilac-deep" aria-hidden="true" />}
    >
      {/* You always plan into Next week — blank and waiting, no timer (§5.2). */}
      <WeekSwitch current={which} />

      <div className="mt-5 space-y-3">
        {DAY_CODES.map((day: DayCode, i) => {
          const date = addDays(weekStart, i);
          return (
            <DayAccordion
              key={day}
              day={day}
              date={date}
              today={which === "this" && isToday(date)}
              index={i}
              meals={{
                BREAKFAST: byDaySlot.get(`${day}:BREAKFAST`) ?? null,
                LUNCH: byDaySlot.get(`${day}:LUNCH`) ?? null,
                DINNER: byDaySlot.get(`${day}:DINNER`) ?? null,
              }}
            />
          );
        })}
      </div>
    </Screen>
  );
}
