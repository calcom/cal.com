import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";

import { attributesRouter } from "@calcom/trpc/server/routers/viewer/attributes/_router";
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

const ServerPageWrapper = async () => {
  const [orgCaller, attributesCaller] = await Promise.all([
    createRouterCaller(viewerOrganizationsRouter),
    createRouterCaller(attributesRouter),
  ]);
  const [org, teams, facetedTeamValues, attributes] = await Promise.all([
    orgCaller.listCurrent(),
    orgCaller.getTeams(),
    orgCaller.getFacetedValues(),
    attributesCaller.list(),
  ]);
  return (
    <MembersView org={org} teams={teams} facetedTeamValues={facetedTeamValues} attributes={attributes} />
  );
};

export default ServerPageWrapper;
