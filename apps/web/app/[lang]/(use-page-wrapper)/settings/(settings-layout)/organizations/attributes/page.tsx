import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import OrgSettingsAttributesPage from "@calcom/ee/organizations/pages/settings/attributes/attributes-list-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("attributes"), t("attribute_meta_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

  return (
    <SettingsHeader title={t("attributes")} description={t("attribute_meta_description")}>
      <OrgSettingsAttributesPage />
    </SettingsHeader>
  );
};

export default Page;
