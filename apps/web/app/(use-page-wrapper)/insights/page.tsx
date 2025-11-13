import { _generateMetadata } from "app/_utils";

import prisma from "@calcom/prisma";

import InsightsPage from "~/insights/insights-view";

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

  return <InsightsPage timeZone={timeZone} />;
};

export default ServerPage;
