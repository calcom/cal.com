import { _generateMetadata } from "app/_utils";

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
  return <InsightsRoutingPage />;
}
