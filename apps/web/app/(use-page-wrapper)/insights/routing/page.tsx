import { _generateMetadata } from "app/_utils";

import { prisma } from "@calcom/prisma";

import InsightsRoutingPage from "~/insights/insights-routing-view";

import { checkInsightsPagePermission } from "../checkInsightsPagePermission";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("insights"),
    (t) => t("insights_subtitle"),
    undefined,
    undefined,
    "/insights/routing"
  );

export default async function Page() {
  const session = await checkInsightsPagePermission();

  const { timeZone } = await prisma.user.findUniqueOrThrow({
    where: { id: session?.user.id ?? -1 },
    select: {
      timeZone: true,
    },
  });

  return <InsightsRoutingPage timeZone={timeZone} />;
}
