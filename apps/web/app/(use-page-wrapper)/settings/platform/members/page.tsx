import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";

import PlatformMembersView from "@calcom/features/ee/platform/pages/settings/members";
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
  const [orgCaller] = await Promise.all([createRouterCaller(viewerOrganizationsRouter)]);
  const [org, teams] = await Promise.all([orgCaller.listCurrent(), orgCaller.getTeams()]);

  return <PlatformMembersView org={org} teams={teams} />;
};

export default ServerPageWrapper;
