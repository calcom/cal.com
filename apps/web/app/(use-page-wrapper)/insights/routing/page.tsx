import { _generateMetadata } from "app/_utils";

import InsightsRoutingPage from "~/insights/insights-routing-view";

import { checkInsightsPagePermission } from "../checkInsightsPagePermission";
import prisma from "@calcom/prisma";

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
  
    const userRepository = {
      async findByIdOrThrow(id: number) {
        return prisma.user.findUniqueOrThrow({
          where: { id },
          select: { timeZone: true },
        });
      },
    };
  
    const { timeZone } = await userRepository.findByIdOrThrow(
      session?.user.id ?? -1
    );

  return <InsightsRoutingPage timeZone={timeZone} />;
}
