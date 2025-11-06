import { _generateMetadata, getTranslate } from "app/_utils";

import { LicenseAdminView } from "@calcom/features/ee/common/pages/license-admin-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("license"),
    (t) => t("admin_license_description"),
    undefined,
    undefined,
    "/settings/admin/license"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("license")} description={t("admin_license_description")}>
      <LicenseAdminView />
    </SettingsHeader>
  );
};

export default Page;

