import { getTranslate } from "app/_utils";

import Shell from "@calcom/features/shell/Shell";

import UpgradeTipWrapper from "./UpgradeTipWrapper";

export default async function InsightsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslate();
  return (
    <div>
      <Shell withoutMain={false} heading={t("insights")} subtitle={t("insights_subtitle")}>
        <UpgradeTipWrapper>{children}</UpgradeTipWrapper>
      </Shell>
    </div>
  );
}
