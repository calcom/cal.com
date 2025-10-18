import { _generateMetadata, getTranslate } from "app/_utils";
import { redirect } from "next/navigation";

import { OtherTeamsListing } from "@calcom/features/ee/organizations/pages/components/OtherTeamsListing";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";

import { validateUserHasOrg } from "../../../actions/validateUserHasOrg";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("org_admin_other_teams"),
    (t) => t("org_admin_other_teams_description"),
    undefined,
    undefined,
    "/settings/organizations/teams/other"
  );

const Page = async () => {
  const t = await getTranslate();
  const session = await validateUserHasOrg();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }
  const organizationId = session?.user?.org?.id;
  const otherTeams = organizationId
    ? await OrganizationRepository.findTeamsInOrgIamNotPartOf({
        userId: session?.user.id,
        parentId: organizationId,
      })
    : [];

  return (
    <SettingsHeader title={t("org_admin_other_teams")} description={t("org_admin_other_teams_description")}>
      <OtherTeamsListing teams={otherTeams} />
    </SettingsHeader>
  );
};

export default Page;
