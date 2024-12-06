import { _generateMetadata, getFixedT } from "app/_utils";
import { headers } from "next/headers";

import OrgSettingsAttributesPage from "@calcom/ee/organizations/pages/settings/attributes/attributes-list-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("attributes"),
    (t) => t("attribute_meta_description")
  );

const Page = async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  const t = await getFixedT(locale ?? "en");

  return (
    <SettingsHeader title={t("attributes")} description={t("attribute_meta_description")}>
      <OrgSettingsAttributesPage />
    </SettingsHeader>
  );
};

export default Page;
