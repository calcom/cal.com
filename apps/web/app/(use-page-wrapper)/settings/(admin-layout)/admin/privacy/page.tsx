import { _generateMetadata, getTranslate } from "app/_utils";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import AdminWatchlistTable from "@calcom/features/ee/watchlist/pages/admin/AdminWatchlistPage";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("privacy_and_security"),
    (t) => t("admin_watchlist_description"),
    undefined,
    undefined,
    "/settings/admin/privacy"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("privacy_and_security")} description={t("admin_watchlist_description")}>
      <LicenseRequired>
        <AdminWatchlistTable />
      </LicenseRequired>
    </SettingsHeader>
  );
};

export default Page;
