import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import TwoFactorAuthView from "~/settings/security/two-factor-auth-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("two_factor_auth"),
    (t) => t("add_an_extra_layer_of_security")
  );
const Page = async () => {
  const session = await getServerSessionForAppDir();

  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader
      title={t("2fa")}
      description={t("set_up_two_factor_authentication")}
      borderInShellHeader={true}>
      <TwoFactorAuthView />
    </SettingsHeader>
  );
};

export default Page;
