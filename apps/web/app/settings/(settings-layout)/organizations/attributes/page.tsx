import { _generateMetadata, getTranslate } from "app/_utils";

import OrgSettingsAttributesPage from "@calcom/ee/organizations/pages/settings/attributes/attributes-list-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("attributes"),
    (t) => t("attribute_meta_description")
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("attributes")} description={t("attribute_meta_description")}>
      <OrgSettingsAttributesPage />
    </SettingsHeader>
  );
};

export default Page;
