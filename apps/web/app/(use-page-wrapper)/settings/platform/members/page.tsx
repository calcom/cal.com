import { _generateMetadata } from "app/_utils";
import { getCachedCurrentOrg, getCachedOrgTeams } from "app/cache/organization";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import PlatformMembersView from "@calcom/features/ee/platform/pages/settings/members";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("platform_members"),
    (t) => t("platform_members_description"),
    undefined,
    undefined,
    "/settings/platform/members"
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

  const [org, teams] = await Promise.all([getCachedCurrentOrg(userId, orgId), getCachedOrgTeams(orgId)]);

  return <PlatformMembersView org={org} teams={teams} />;
};

export default ServerPageWrapper;
