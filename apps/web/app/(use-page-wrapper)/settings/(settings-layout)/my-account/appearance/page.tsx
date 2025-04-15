import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { redirect } from "next/navigation";

import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { viewerTeamsRouter } from "@calcom/trpc/server/routers/viewer/teams/_router";

import AppearancePage from "~/settings/my-account/appearance-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("appearance"),
    (t) => t("appearance_description")
  );

const Page = async () => {
  const [meCaller, teamsCaller] = await Promise.all([
    createRouterCaller(meRouter),
    createRouterCaller(viewerTeamsRouter),
  ]);

  const user = await meCaller.get();

  if (!user) {
    redirect("/auth/login");
  }
  const isCurrentUsernamePremium =
    user && hasKeyInMetadata(user, "isPremium") ? !!user.metadata.isPremium : false;
  const hasPaidPlan = IS_SELF_HOSTED
    ? true
    : (await teamsCaller.hasTeamPlan())?.hasTeamPlan || isCurrentUsernamePremium;

  return <AppearancePage user={user} hasPaidPlan={hasPaidPlan} />;
};

export default Page;
