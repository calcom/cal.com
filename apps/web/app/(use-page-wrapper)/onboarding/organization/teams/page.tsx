import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { OrganizationTeamsView } from "~/onboarding/organization/teams/organization-teams-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("organization_teams")}`,
    () => "",
    true,
    undefined,
    "/onboarding/organization/teams"
  );
};

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const userEmail = session.user.email || "";

  return <OrganizationTeamsView userEmail={userEmail} />;
};

export default ServerPage;
