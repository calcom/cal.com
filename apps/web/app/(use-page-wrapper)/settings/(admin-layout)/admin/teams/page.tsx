import { _generateMetadata, getTranslate } from "app/_utils";

import AdminTeamsListingView from "@calcom/features/ee/teams/pages/admin-teams-listing-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

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
      <AdminTeamsListingView />
    </SettingsHeader>
  );
};

export default Page;

