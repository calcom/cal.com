import { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import OrgSSOView from "@calcom/features/ee/sso/page/orgs-sso-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("sso_configuration"), t("sso_configuration_description_orgs"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

  return (
    <SettingsHeader title={t("sso_configuration")} description={t("sso_configuration_description_orgs")}>
      <OrgSSOView />
    </SettingsHeader>
  );
};

export default Page;
