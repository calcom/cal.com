import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";

import PlatformMembersView from "@calcom/features/ee/platform/pages/settings/members";
import { attributesRouter } from "@calcom/trpc/server/routers/viewer/attributes/_router";
import { viewerOrganizationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/_router";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("platform_members"),
    (t) => t("platform_members_description"),
    undefined,
    undefined,
    "/settings/platform/members"
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
    <PlatformMembersView
      org={org}
      teams={teams}
      facetedTeamValues={facetedTeamValues}
      attributes={attributes}
    />
  );
};

export default ServerPageWrapper;
