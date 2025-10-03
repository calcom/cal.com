import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";

import Insights from "../../../../modules/insights/[tab]/insights-view";

export const generateMetadata = async ({ params }: { params: { category: string } }) => {
  return await _generateMetadata(
    (t) => t("insights"),
    (t) => t("insights_description"),
    undefined,
    undefined,
    `/apps/installed/${params.category}`
  );
};

const InsightsWrapper = async ({ params }: PageProps) => {
  const validTabs = ["bookings", "routing", "workflows"] as const;
  const parsedTab = (await params).tab;
  const tab = (validTabs.includes(parsedTab as any) ? parsedTab : "bookings") as (typeof validTabs)[number];

  return <Insights tab={tab} />;
};

export default InsightsWrapper;
