import { _generateMetadata } from "app/_utils";

import InsightsRoutingPage from "~/insights/insights-routing-view";

import { checkInsightsPermission } from "../checkInsightsPermission";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("insights"),
    (t) => t("insights_subtitle"),
    undefined,
    undefined,
    "/insights/routing"
  );

export default async function Page() {
  await checkInsightsPermission();

  return <InsightsRoutingPage />;
}
