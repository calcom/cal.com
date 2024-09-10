import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";
import { getServerSession } from "next-auth";

import { AUTH_OPTIONS } from "@calcom/feature-auth/lib/next-auth-options";
import SAMLSSO from "@calcom/features/ee/sso/page/user-sso-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("sso_configuration"),
    (t) => t("sso_configuration_description")
  );

const Page = async () => {
  const session = await getServerSession(AUTH_OPTIONS);

  const t = await getFixedT(session?.user.locale || "en");

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
