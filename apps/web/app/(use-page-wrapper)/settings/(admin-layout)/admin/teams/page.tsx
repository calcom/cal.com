import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import AdminTeamTable from "@calcom/features/teams/pages/admin/AdminTeamPage";
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
      <LicenseRequired>
        <AdminTeamTable />
      </LicenseRequired>
    </SettingsHeader>
  );
};

export default Page;
