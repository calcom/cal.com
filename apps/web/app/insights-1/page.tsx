import InsightsPage from "@pages/insights";
import { trpc } from "app/_trpc/client";

export default function Insights() {
  return <InsightsPage trpcAppDir={trpc} />;
}
