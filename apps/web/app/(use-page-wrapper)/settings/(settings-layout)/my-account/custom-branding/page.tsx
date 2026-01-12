import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { getCachedHasTeamPlan } from "@calcom/web/app/cache/membership";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import CustomBrandingPage from "~/settings/my-account/custom-branding-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("custom_branding"),
    (t) => t("custom_branding_description"),
    undefined,
    undefined,
    "/settings/my-account/custom-branding"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  const redirectUrl = "/auth/login?callbackUrl=/settings/my-account/custom-branding";

  if (!userId) {
    redirect(redirectUrl);
  }

  const [meCaller] = await Promise.all([createRouterCaller(meRouter), getCachedHasTeamPlan(userId)]);

  const user = await meCaller.get();

  if (!user) {
    redirect(redirectUrl);
  }

  return <CustomBrandingPage user={user} />;
};

export default Page;
