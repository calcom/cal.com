import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { OrganizationBrandView } from "~/onboarding/organization/brand/organization-brand-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("organization_brand")}`,
    () => "",
    true,
    undefined,
    "/onboarding/organization/brand"
  );
};

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const userEmail = session.user.email || "";

  return <OrganizationBrandView userEmail={userEmail} />;
};

export default ServerPage;
