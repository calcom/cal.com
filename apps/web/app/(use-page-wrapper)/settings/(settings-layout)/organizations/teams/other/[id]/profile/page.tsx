import { _generateMetadata, getTranslate } from "app/_utils";

import LegacyPage from "@calcom/features/ee/organizations/pages/settings/other-team-profile-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

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

  return (
    <SettingsHeader title={t("profile")} description={t("profile_team_description")}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
