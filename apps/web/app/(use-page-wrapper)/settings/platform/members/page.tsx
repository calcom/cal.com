import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import PlatformMembersView from "@calcom/features/ee/platform/pages/settings/members";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("platform_members"),
    (t) => t("platform_members_description"),
    undefined,
    undefined,
    "/settings/platform/members"
  );

const getCachedCurrentOrg = unstable_cache(
  async (userId: number, orgId: number) => {
    return await OrganizationRepository.findCurrentOrg({
      userId,
      orgId,
    });
  },
  undefined,
  { revalidate: 3600, tags: ["viewer.organizations.listCurrent"] } // Cache for 1 hour
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
  const orgId = session?.user?.profile?.organizationId ?? session?.user?.org?.id;
  const userId = session?.user?.id;
  if (!userId) {
    return redirect("/auth/login?callbackUrl=/settings/platform/members");
  }
  if (!orgId) {
    return redirect("/settings/my-account/profile");
  }

  const [org, teams] = await Promise.all([getCachedCurrentOrg(userId, orgId), getCachedTeams(orgId)]);

  return <PlatformMembersView org={org} teams={teams} />;
};

export default ServerPageWrapper;
