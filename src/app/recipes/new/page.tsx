import { Screen } from "@/components/screen";
import { RecipeForm } from "@/components/recipe-form";

export default function NewRecipePage() {
  return (
    <Screen title="Add a recipe" subtitle="By hand — URL import arrives in phase 2">
      <RecipeForm />
    </Screen>
  );
}
