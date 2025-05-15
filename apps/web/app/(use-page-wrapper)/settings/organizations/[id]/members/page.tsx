import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";

import { viewerOrganizationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/_router";

import MembersPage from "~/members/members-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("organization_members"),
    (t) => t("organization_description"),
    undefined,
    undefined,
    `/settings/organizations/${(await params).id}/members`
  );

const ServerPageWrapper = async () => {
  const orgCaller = await createRouterCaller(viewerOrganizationsRouter);
  const org = await orgCaller.listCurrent();
  return <MembersPage org={org} />;
};

export default ServerPageWrapper;
