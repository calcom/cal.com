import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOrgMembersPageData } from "~/members/getOrgMembersPageData";
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

  if (!session?.user.id || !session?.user.profile?.organizationId || !session?.user.org) {
    return redirect("/settings/profile");
  }

  const { org, teams, facetedTeamValues, attributes, permissions } = await getOrgMembersPageData(session);

  return (
    <MembersView
      org={org}
      teams={teams}
      facetedTeamValues={facetedTeamValues}
      attributes={attributes}
      permissions={permissions}
    />
  );
};

export default Page;
