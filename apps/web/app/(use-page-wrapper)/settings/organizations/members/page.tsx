import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { AttributeRepository } from "@calcom/lib/server/repository/attribute";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { viewerOrganizationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/_router";

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

const getCachedAttributes = unstable_cache(
  async (orgId: number) => {
    return await AttributeRepository.findAllByOrgIdWithOptions({ orgId });
  },
  undefined,
  { revalidate: 3600, tags: ["viewer.attributes.list"] } // Cache for 1 hour
);

const Page = async () => {
  const orgCaller = await createRouterCaller(viewerOrganizationsRouter);
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const orgId = session?.user?.org?.id;
  if (!orgId) {
    return redirect("/settings/my-account/profile");
  }

  const [org, teams, facetedTeamValues] = await Promise.all([
    orgCaller.listCurrent(),
    OrganizationRepository.getTeams({ organizationId: orgId }),
    OrganizationRepository.getFacetedValues({ organizationId: orgId }),
  ]);
  const attributes = await getCachedAttributes(org.id);
  return (
    <MembersView org={org} teams={teams} facetedTeamValues={facetedTeamValues} attributes={attributes} />
  );
};

export default Page;
