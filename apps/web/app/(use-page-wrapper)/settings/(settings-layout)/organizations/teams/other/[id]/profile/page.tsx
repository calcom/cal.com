import { _generateMetadata, getTranslate } from "app/_utils";

import LegacyPage from "~/ee/organizations/other-team-profile-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import { validateUserHasOrg } from "../../../../actions/validateUserHasOrg";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_team_description"),
    undefined,
    undefined,
    `/settings/organizations/teams/other/${(await params).id}/profile`
  );

const Page = async () => {
  const t = await getTranslate();

  await validateUserHasOrg();

  return (
    <SettingsHeader title={t("profile")} description={t("profile_team_description")}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
