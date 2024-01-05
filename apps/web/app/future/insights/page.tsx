import LegacyPage from "@pages/insights/index";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { notFound } from "next/navigation";

import { getLayout } from "@calcom/features/MainLayoutAppDir";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Insights",
    (t) => t("insights_subtitle")
  );

async function getData() {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const flags = await getFeatureFlagMap(prisma);

  if (flags.insights === false) {
    return notFound();
  }

  return {};
}

export default WithLayout({ getLayout, getData, Page: LegacyPage });
