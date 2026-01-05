import { _generateMetadata, getTranslate } from "app/_utils";

import { TeamsListView } from "@calcom/features/admin/teams/components/TeamsListView";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams_and_organizations"),
    (t) => t("admin_teams_description"),
    undefined,
    undefined,
    "/settings/admin/teams"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("teams_and_organizations")} description={t("admin_teams_description")}>
      <TeamsListView />
    </SettingsHeader>
  );
};

export default Page;
