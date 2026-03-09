import { CTA_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import prisma from "@calcom/prisma";
import { _generateMetadata, getTranslate } from "app/_utils";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import InsightsPage from "~/insights/views/insights-view";
import Shell from "~/shell/Shell";

import { checkInsightsPagePermission } from "./checkInsightsPagePermission";
import { getInsightsUpgradeBanner } from "./getInsightsUpgradeBanner";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("insights"),
    (t) => t("insights_subtitle"),
    undefined,
    undefined,
    "/insights"
  );

export default async function Page() {
  const session = await checkInsightsPagePermission();

  const banner = await getInsightsUpgradeBanner(session.user.id);
  if (banner) return banner;

  const t = await getTranslate();

  const userRepository = new UserRepository(prisma);
  const user = await userRepository.getTimeZoneAndDefaultScheduleId({ userId: session.user.id });
  const timeZone = user?.timeZone ?? "UTC";

  return (
    <Shell withoutMain={true}>
      <ShellMainAppDir
        heading={t("insights")}
        subtitle={t("insights_subtitle")}
        actions={<div className={`flex items-center gap-2 ${CTA_CONTAINER_CLASS_NAME}`} />}>
        <InsightsPage timeZone={timeZone} />
      </ShellMainAppDir>
    </Shell>
  );
}
