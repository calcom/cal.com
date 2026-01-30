import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import LicenseRequired from "~/ee/common/components/LicenseRequired";
import AdminOrgTable from "~/ee/organizations/admin/AdminOrgPage";
import SettingsHeader from "@calcom/web/modules/settings/components/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organizations"),
    (t) => t("orgs_page_description"),
    undefined,
    undefined,
    "/settings/admin/organizations"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("organizations")} description={t("orgs_page_description")}>
      <LicenseRequired>
        <AdminOrgTable />
      </LicenseRequired>
    </SettingsHeader>
  );
};

export default Page;
