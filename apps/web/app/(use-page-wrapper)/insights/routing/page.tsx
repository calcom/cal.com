import { _generateMetadata } from "app/_utils";
import { notFound } from "next/navigation";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";

import InsightsRoutingPage from "~/insights/insights-routing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("insights"),
    (t) => t("insights_subtitle"),
    undefined,
    undefined,
    "/insights/routing"
  );

export default async function Page() {
  const featuresRepository = new FeaturesRepository();
  const insightsEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("insights");

  if (!insightsEnabled) {
    return notFound();
  }

  return <InsightsRoutingPage />;
}
