import { _generateMetadata } from "app/_utils";

import InsightsVirtualQueuesPage from "~/insights/insights-virtual-queues-view";

import { checkInsightsPermission } from "../checkInsightsPermission";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("insights"),
    (t) => t("insights_subtitle"),
    undefined,
    undefined,
    "/insights/router-position"
  );

export default async function Page() {
  await checkInsightsPermission();

  return <InsightsVirtualQueuesPage />;
}
