import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import SAMLSSO from "~/ee/sso/views/user-sso-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("sso_configuration"),
    (t) => t("sso_configuration_description"),
    undefined,
    undefined,
    "/settings/security/sso"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader
      title={t("sso_configuration")}
      description={t("sso_configuration_description")}
      borderInShellHeader={true}>
      <SAMLSSO />
    </SettingsHeader>
  );
};

export default Page;
