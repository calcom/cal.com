import { getTranslate } from "app/_utils";

import { CTA_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";
import Shell from "@calcom/features/shell/Shell";

import UpgradeTipWrapper from "./UpgradeTipWrapper";

export default async function InsightsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslate();

  return (
    <div>
      <Shell
        withoutMain={false}
        heading={t("insights")}
        subtitle={t("insights_subtitle")}
        actions={<div className={`mb-2 flex items-center gap-2 ${CTA_CONTAINER_CLASS_NAME}`} />}>
        <UpgradeTipWrapper>{children}</UpgradeTipWrapper>
      </Shell>
    </div>
  );
}
