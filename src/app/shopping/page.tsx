import { ShoppingBasket } from "lucide-react";

import { EmptyState, Screen } from "@/components/screen";
import { ShoppingList } from "@/components/shopping-list";
import { buildShoppingList, getOrCreateWeek } from "@/lib/plan-queries";
import { formatWeekRange, startOfWeek } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const week = await getOrCreateWeek("this");
  const groups = await buildShoppingList(week.startDate);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <Screen
      title="Shopping"
      subtitle={`${formatWeekRange(startOfWeek())} · ${total} ${total === 1 ? "item" : "items"}`}
    >
      {total === 0 ? (
        <EmptyState
          icon={<ShoppingBasket className="size-7" aria-hidden="true" />}
          title="Nothing to buy yet"
          body="Add some meals to this week's plan and the ingredients will land here, sorted by aisle."
        />
      ) : (
        <ShoppingList groups={groups} />
      )}
    </Screen>
  );
}
