import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { notFound } from "next/navigation";

import { getFeatureFlag } from "@calcom/features/flags/server/utils";

import InsightsRoutingPage from "~/insights/insights-routing-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("insights"), t("insights_subtitle"));
};

export default async function Page() {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const insightsEnabled = await getFeatureFlag(prisma, "insights");

  if (!insightsEnabled) {
    return notFound();
  }

  return <InsightsRoutingPage />;
}
