import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { getCachedHasTeamPlan } from "@calcom/web/app/cache/membership";

import { buildLegacyHeaders, buildLegacyCookies } from "@lib/buildLegacyCtx";

import AppearancePage from "~/settings/my-account/appearance-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("appearance"),
    (t) => t("appearance_description"),
    undefined,
    undefined,
    "/settings/my-account/appearance"
  );

const Page = async () => {
  const req = {
    headers: buildLegacyHeaders(await headers()),
    cookies: buildLegacyCookies(await cookies()),
  } as any;
  const session = await getServerSession({ req });
  const userId = session?.user?.id;
  const redirectUrl = "/auth/login?callbackUrl=/settings/my-account/appearance";

  if (!userId) {
    redirect(redirectUrl);
  }

  const [meCaller, hasTeamPlan] = await Promise.all([
    createRouterCaller(meRouter),
    getCachedHasTeamPlan(userId),
  ]);

  const user = await meCaller.get();

  if (!user) {
    redirect(redirectUrl);
  }
  const isCurrentUsernamePremium =
    user && hasKeyInMetadata(user, "isPremium") ? !!user.metadata.isPremium : false;
  const hasPaidPlan = IS_SELF_HOSTED ? true : hasTeamPlan?.hasTeamPlan || isCurrentUsernamePremium;

  return <AppearancePage user={user} hasPaidPlan={hasPaidPlan} />;
};

export default Page;
