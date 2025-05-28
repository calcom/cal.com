import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";

import { AttributeRepository } from "@calcom/lib/server/repository/attribute";
import { viewerOrganizationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/_router";

import { MembersView } from "~/members/members-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("organization_members"),
    (t) => t("organization_description"),
    undefined,
    undefined,
    `/settings/organizations/${(await params).id}/members`
  );

const getCachedAttributes = unstable_cache(
  async (orgId: number) => {
    return await AttributeRepository.findAllByOrgIdWithOptions({ orgId });
  },
  ["viewer.attributes.list"],
  { revalidate: 3600 } // Cache for 1 hour
);

const ServerPageWrapper = async () => {
  const orgCaller = createRouterCaller(viewerOrganizationsRouter);
  const [org, teams, facetedTeamValues] = await Promise.all([
    orgCaller.listCurrent(),
    orgCaller.getTeams(),
    orgCaller.getFacetedValues(),
  ]);
  const attributes = await getCachedAttributes(org.id);

  return (
    <MembersView org={org} teams={teams} facetedTeamValues={facetedTeamValues} attributes={attributes} />
  );
};

export default ServerPageWrapper;
