import { getTranslate } from "app/_utils";

import Shell from "@calcom/features/shell/Shell";

import { UpgradeInsights } from "@components/UpgradePageWrapper";

export default async function InsightsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslate();
  return (
    <div>
      <Shell withoutMain={false} withoutSeo={true} heading={t("insights")} subtitle={t("insights_subtitle")}>
        <UpgradeInsights>{children}</UpgradeInsights>
      </Shell>
    </div>
  );
}
