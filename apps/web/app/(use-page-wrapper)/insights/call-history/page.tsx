import { _generateMetadata } from "app/_utils";

import InsightsCallHistoryPage from "~/insights/insights-call-history-view";

import { checkInsightsPagePermission } from "../checkInsightsPagePermission";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("call_history"),
    (t) => t("call_history_subtitle"),
    undefined,
    undefined,
    "/insights/call-history"
  );

export default async function Page() {
  await checkInsightsPagePermission();

  return <InsightsCallHistoryPage />;
}
