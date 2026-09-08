import { redirect } from "next/navigation";

export default function Home() {
  // The plan is the thing you open the app to check.
  redirect("/plan");
}
