import SettingsLayoutAppDir from "app/(use-page-wrapper)/settings/(settings-layout)/layout";
import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata, getTranslate } from "app/_utils";

import { CTA_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { attributesRouter } from "@calcom/trpc/server/routers/viewer/attributes/_router";
import { viewerOrganizationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/_router";

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
  const t = await getTranslate();
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

  const children = (
    <SettingsHeader
      title={t("organization_members")}
      description={t("organization_description")}
      ctaClassName={CTA_CONTAINER_CLASS_NAME}>
      <MembersView org={org} teams={teams} facetedTeamValues={facetedTeamValues} attributes={attributes} />
    </SettingsHeader>
  );
  return await SettingsLayoutAppDir({ children, containerClassName: "lg:max-w-screen-2xl" });
};

export default Page;
