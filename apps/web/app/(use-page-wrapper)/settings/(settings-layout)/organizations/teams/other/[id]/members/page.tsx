import { _generateMetadata, getTranslate } from "app/_utils";

import LegacyPage, { TeamMembersCTA } from "~/ee/organizations/other-team-members-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import { validateUserHasOrg } from "../../../../actions/validateUserHasOrg";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("team_members"),
    (t) => t("members_team_description"),
    undefined,
    undefined,
    `/settings/organizations/teams/other/${(await params).id}/members`
  );

const Page = async () => {
  const t = await getTranslate();

  await validateUserHasOrg();

  return (
    <SettingsHeader
      title={t("team_members")}
      description={t("members_team_description")}
      CTA={<TeamMembersCTA />}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
