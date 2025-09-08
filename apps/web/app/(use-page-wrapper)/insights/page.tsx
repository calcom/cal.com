import { _generateMetadata } from "app/_utils";

import prisma from "@calcom/prisma";

import InsightsPage from "~/insights/insights-view";

import { checkInsightsPermission } from "./checkInsightsPermission";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("insights"),
    (t) => t("insights_subtitle"),
    undefined,
    undefined,
    "/insights"
  );

const ServerPage = async () => {
  const session = await checkInsightsPermission();

  const { timeZone } = await prisma.user.findUniqueOrThrow({
    where: { id: session?.user.id ?? -1 },
    select: {
      timeZone: true,
    },
  });

  return <InsightsPage timeZone={timeZone} />;
};

export default ServerPage;
