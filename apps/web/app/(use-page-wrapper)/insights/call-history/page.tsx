import { CTA_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";
import { _generateMetadata, getTranslate } from "app/_utils";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import InsightsCallHistoryPage from "~/insights/views/insights-call-history-view";
import Shell from "~/shell/Shell";

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

  const t = await getTranslate();

  return (
    <Shell withoutMain={true}>
      <ShellMainAppDir
        heading={t("insights")}
        subtitle={t("insights_subtitle")}
        actions={<div className={`flex items-center gap-2 ${CTA_CONTAINER_CLASS_NAME}`} />}>
        <InsightsCallHistoryPage />
      </ShellMainAppDir>
    </Shell>
  );
}
