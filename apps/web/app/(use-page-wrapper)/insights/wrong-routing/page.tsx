import { _generateMetadata } from "app/_utils";

import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import prisma from "@calcom/prisma";

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

  const userRepository = new UserRepository(prisma);
  const user = await userRepository.getTimeZoneAndDefaultScheduleId({ userId: session?.user.id ?? -1 });

  return <InsightsWrongRoutingPage timeZone={user?.timeZone ?? "UTC"} />;
}
