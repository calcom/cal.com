import { _generateMetadata, getTranslate } from "app/_utils";

import PoliciesListingView from "@calcom/features/policies/pages/policies-listing-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("policies"),
    (t) => t("admin_policies_description"),
    undefined,
    undefined,
    "/settings/admin/policies"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("policies")} description={t("admin_policies_description")}>
      <PoliciesListingView />
    </SettingsHeader>
  );
};

export default Page;
