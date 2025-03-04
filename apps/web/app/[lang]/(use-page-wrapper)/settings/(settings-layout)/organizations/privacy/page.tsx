import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import PrivacyView from "@calcom/features/ee/organizations/pages/settings/privacy";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("privacy"), t("privacy_organization_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

  return (
    <SettingsHeader title={t("privacy")} description={t("privacy_organization_description")}>
      <PrivacyView />
    </SettingsHeader>
  );
};

export default Page;
