import type { PageProps } from "app/_types";
import { getTranslate } from "app/_utils";

import Shell from "@calcom/features/shell/Shell";

import UpgradeTipWrapper from "./UpgradeTipWrapper";

export default async function InsightsLayout({
  params,
  children,
}: {
  params: PageProps["params"];
  children: React.ReactNode;
}) {
  const t = await getTranslate(params.lang as string);
  return (
    <div>
      <Shell withoutMain={false} withoutSeo={true} heading={t("insights")} subtitle={t("insights_subtitle")}>
        <UpgradeTipWrapper>{children}</UpgradeTipWrapper>
      </Shell>
    </div>
  );
}
