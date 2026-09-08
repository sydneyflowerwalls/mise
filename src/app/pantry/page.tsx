import { Package } from "lucide-react";

import { EmptyState, Screen } from "@/components/screen";

export default function PantryPage() {
  return (
    <Screen title="Pantry" subtitle="Phase 3">
      <EmptyState
        icon={<Package className="size-7" aria-hidden="true" />}
        title="Not built yet — on purpose"
        body="The pantry is the feature most likely to be abandoned. It arrives once the plan and shopping list are in real weekly use, and the database is already shaped for it."
      />
    </Screen>
  );
}
