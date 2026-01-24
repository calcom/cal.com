import { _generateMetadata } from "app/_utils";

import prisma from "@calcom/prisma";

import InsightsPage from "~/insights/views/insights-view";

import { checkInsightsPagePermission } from "./checkInsightsPagePermission";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("insights"),
    (t) => t("insights_subtitle"),
    undefined,
    undefined,
    "/insights"
  );

const ServerPage = async () => {
  const session = await checkInsightsPagePermission();

  const { timeZone } = await prisma.user.findUniqueOrThrow({
    where: { id: session?.user.id ?? -1 },
    select: {
      timeZone: true,
    },
  });

  return <InsightsPage timeZone={timeZone} />;
};

export default ServerPage;
