import { _generateMetadata, getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import { TeamFeaturesListingView } from "./TeamFeaturesListingView";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("admin_teams_description"),
    undefined,
    undefined,
    "/settings/admin/teams"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("teams")} description={t("admin_teams_description")}>
      <TeamFeaturesListingView />
    </SettingsHeader>
  );
};

export default Page;
