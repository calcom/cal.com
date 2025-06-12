import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import PlatformMembersView from "@calcom/features/ee/platform/pages/settings/members";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { viewerOrganizationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("platform_members"),
    (t) => t("platform_members_description"),
    undefined,
    undefined,
    "/settings/platform/members"
  );

const getCachedTeams = unstable_cache(
  async (orgId: number) => {
    return await OrganizationRepository.getTeams({ organizationId: orgId });
  },
  undefined,
  { revalidate: 3600, tags: ["viewer.organizations.getTeams"] } // Cache for 1 hour
);

const ServerPageWrapper = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const orgId = session?.user?.org?.id ?? session?.user?.profile?.organizationId;
  if (!orgId) {
    return redirect("/settings/my-account/profile");
  }

  const [orgCaller] = await Promise.all([createRouterCaller(viewerOrganizationsRouter)]);
  const [org, teams] = await Promise.all([orgCaller.listCurrent(), getCachedTeams(orgId)]);

  return <PlatformMembersView org={org} teams={teams} />;
};

export default ServerPageWrapper;
