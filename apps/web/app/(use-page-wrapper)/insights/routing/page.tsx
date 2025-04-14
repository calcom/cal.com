import { _generateMetadata } from "app/_utils";
import { notFound } from "next/navigation";

import { getFeatureFlag } from "@calcom/features/flags/server/utils";

import InsightsRoutingPage from "~/insights/insights-routing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("insights"),
    (t) => t("insights_subtitle")
  );

export default async function Page() {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const insightsEnabled = await getFeatureFlag(prisma, "insights");

  if (!insightsEnabled) {
    return notFound();
  }

  return <InsightsRoutingPage />;
}
