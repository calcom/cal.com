import { _generateMetadata } from "app/_utils";

import InsightsPage from "~/insights/insights-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("insights"),
    (t) => t("insights_subtitle"),
    undefined,
    undefined,
    "/insights"
  );

export default async function Page() {
  return <InsightsPage />;
}
