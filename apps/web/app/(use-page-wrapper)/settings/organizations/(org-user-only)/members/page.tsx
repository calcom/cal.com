import { _generateMetadata } from "app/_utils";
import { getCachedOrgAttributes } from "app/cache/attribute";
import { getCachedCurrentOrg, getCachedOrgTeams } from "app/cache/organization";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { MembershipRole } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { MembersView } from "~/members/members-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organization_members"),
    (t) => t("organization_description"),
    undefined,
    undefined,
    "/settings/organizations/members"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const orgId = session?.user?.profile?.organizationId ?? session?.user?.org?.id;
  const userId = session?.user?.id;
  if (!userId) {
    return redirect("/auth/login?callbackUrl=/settings/organizations/members");
  }
  if (!orgId) {
    return redirect("/settings/my-account/profile");
  }

  const [org, teams, attributes] = await Promise.all([
    getCachedCurrentOrg(userId, orgId),
    getCachedOrgTeams(orgId),
    getCachedOrgAttributes(orgId),
  ]);

  const facetedTeamValues = {
    roles: [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER],
    teams,
    attributes: attributes.map((attribute) => ({
      id: attribute.id,
      name: attribute.name,
      options: Array.from(new Set(attribute.options.map((option) => option.value))).map((value) => ({
        value,
      })),
    })),
  };

  return (
    <MembersView org={org} teams={teams} facetedTeamValues={facetedTeamValues} attributes={attributes} />
  );
};

export default Page;
