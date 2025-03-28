import { _generateMetadata } from "app/_utils";
import { notFound } from "next/navigation";

import { getFeatureFlag } from "@calcom/features/flags/server/utils";
import { prisma } from "@calcom/prisma";

import InsightsVirtualQueuesPage from "~/insights/insights-virtual-queues-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("insights"),
    (t) => t("insights_subtitle")
  );

export default async function Page() {
  const insightsEnabled = await getFeatureFlag(prisma, "insights");

  if (!insightsEnabled) {
    return notFound();
  }

  return <InsightsVirtualQueuesPage />;
}
