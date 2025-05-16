import { _generateMetadata } from "app/_utils";

import InsightsVirtualQueuesPage from "~/insights/insights-virtual-queues-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("insights"),
    (t) => t("insights_subtitle"),
    undefined,
    undefined,
    "/insights/router-position"
  );

export default async function Page() {
  return <InsightsVirtualQueuesPage />;
}
