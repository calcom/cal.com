import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { redirect } from "next/navigation";

import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { travelSchedulesRouter } from "@calcom/trpc/server/routers/viewer/travelSchedules/_router";

import GeneralView from "~/settings/my-account/general-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("general"),
    (t) => t("general_description")
  );

const Page = async () => {
  const [meCaller, travelSchedulesCaller] = await Promise.all([
    createRouterCaller(meRouter),
    createRouterCaller(travelSchedulesRouter),
  ]);
  const [user, travelSchedules] = await Promise.all([meCaller.get(), travelSchedulesCaller.get()]);
  if (!user) {
    redirect("/auth/login");
  }
  return <GeneralView user={user} travelSchedules={travelSchedules ?? []} />;
};

export default Page;
