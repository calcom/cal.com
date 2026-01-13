import { _generateMetadata, getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import AdminBillingView from "~/settings/admin/billing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("admin_billing_title"),
    (t) => t("admin_billing_description"),
    undefined,
    undefined,
    "/settings/admin/billing"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("admin_billing_title")} description={t("admin_billing_description")}>
      <AdminBillingView />
    </SettingsHeader>
  );
};

export default Page;
