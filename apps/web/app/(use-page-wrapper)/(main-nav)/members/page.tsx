import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { _generateMetadata, getTranslate } from "app/_utils";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
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
    "/members"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user.id || !session?.user.profile?.organizationId || !session?.user.org) {
    return redirect("/settings/my-account/profile");
  }

  const { org, teams, facetedTeamValues, attributes, permissions } = await getOrgMembersPageData(session);
  const t = await getTranslate();

  return (
    <ShellMainAppDir heading={t("organization_members")} subtitle={t("organization_description")}>
      <MembersView
        org={org}
        teams={teams}
        facetedTeamValues={facetedTeamValues}
        attributes={attributes}
        permissions={permissions}
      />
    </ShellMainAppDir>
  );
};

export default Page;
