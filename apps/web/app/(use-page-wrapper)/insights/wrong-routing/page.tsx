import { _generateMetadata } from "app/_utils";

import { prisma } from "@calcom/prisma";

import InsightsWrongRoutingPage from "~/insights/views/insights-wrong-routing-view";

import { checkInsightsPagePermission } from "../checkInsightsPagePermission";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("wrong_routing"),
    (t) => t("wrong_routing_description"),
    undefined,
    undefined,
    "/insights/wrong-routing"
  );

export default async function Page() {
  const session = await checkInsightsPagePermission();

  const { timeZone } = await prisma.user.findUniqueOrThrow({
    where: { id: session?.user.id ?? -1 },
    select: {
      timeZone: true,
    },
  });

  return <InsightsWrongRoutingPage timeZone={timeZone} />;
}
