import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { WEBAPP_URL } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import PlatformPlansView from "~/settings/platform/plans/platform-plans-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${t("platform")} ${t("plans")}`,
    () => "",
    undefined,
    undefined,
    "/settings/platform/plans"
  );
};

const ServerPageWrapper = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const callbackUrl = `${WEBAPP_URL}/settings/platform/plans`;

  if (!session?.user) {
    redirect(`/login?callbackUrl=${callbackUrl}`);
  }

  return <PlatformPlansView />;
};

export default ServerPageWrapper;
