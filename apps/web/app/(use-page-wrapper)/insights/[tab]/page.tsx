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

const InsightsWrapper = ({ params }: PageProps) => {
  const validTabs = ["bookings", "routing", "workflows"] as const;
  const tab = validTabs.includes(params.tab as any) ? params.tab : "bookings";

  return <Insights tab={tab} />;
};

export default InsightsWrapper;
