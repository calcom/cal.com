import { _generateMetadata, getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import { TeamFeaturesListingView } from "./TeamFeaturesListingView";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("team_features"),
    (t) => t("admin_team_features_description"),
    undefined,
    undefined,
    "/settings/admin/flags/teams"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("team_features")} description={t("admin_team_features_description")}>
      <TeamFeaturesListingView />
    </SettingsHeader>
  );
};

export default Page;
